import { getSupabaseServerClient } from "@/lib/supabase-server";

const MIN_WITHDRAWAL = 50;
const COMMISSION = 0.1;
const CLEARING_HOURS = 24;

type Method = "bank" | "voucher" | "cash";

export async function POST(request: Request) {
  try {
    const { clerkId, amount, method } = (await request.json()) as {
      clerkId: string;
      amount: number;
      method: Method;
    };

    const requested = Number(amount);

    if (!clerkId || !Number.isFinite(requested) || !method) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (requested < MIN_WITHDRAWAL) {
      return Response.json(
        { error: `Minimum withdrawal is R${MIN_WITHDRAWAL}` },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("profile_data")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (userError) throw userError;

    const bank = userRow?.profile_data?.bank_account;

    if (method === "bank" && !bank?.last4) {
      return Response.json(
        { error: "Add a bank account before withdrawing" },
        { status: 400 },
      );
    }

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (driverError) throw driverError;

    if (!driver) {
      return Response.json({ error: "Driver record not found" }, { status: 404 });
    }

    // Recompute the balance server-side. The client's number is a display
    // value, never an authority — otherwise anyone can withdraw anything.
    const cutoff = new Date(Date.now() - CLEARING_HOURS * 3600_000).toISOString();

    const [completed, payouts] = await Promise.all([
      supabase
        .from("rides")
        .select("fare_price, completed_at")
        .eq("driver_id", driver.id)
        .eq("status", "completed")
        .lte("completed_at", cutoff),
      supabase
        .from("payouts")
        .select("amount, status")
        .eq("driver_id", driver.id),
    ]);

    if (completed.error) throw completed.error;
    if (payouts.error) throw payouts.error;

    const cleared = (completed.data ?? []).reduce(
      (sum: number, r: any) => sum + ((r.fare_price ?? 0) * (1 - COMMISSION)) / 100,
      0,
    );
    const withdrawn = (payouts.data ?? [])
      .filter((p: any) => p.status !== "failed")
      .reduce((sum: number, p: any) => sum + Number(p.amount ?? 0), 0);

    const available = Math.max(0, cleared - withdrawn);

    if (requested > available) {
      return Response.json(
        { error: `Only R${available.toFixed(2)} is available` },
        { status: 409 },
      );
    }

    // Voucher / cash withdrawals get a reference code the driver shows
    // at a partner store. Bank transfers don't need one.
    const code =
      method === "voucher"
        ? `VCH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        : method === "cash"
          ? `CASH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
          : null;

    const { data, error } = await supabase
      .from("payouts")
      .insert({
        driver_id: driver.id,
        amount: requested,
        status: "pending",
        method,
        bank_last4: method === "bank" ? bank?.last4 ?? null : null,
        reference_code: code,
      })
      .select()
      .single();

    if (error) throw error;

    // In production this is where a Stripe/Paystack transfer or voucher
    // provider call would happen. For now, payouts stay "pending" until
    // marked paid by an admin.

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}