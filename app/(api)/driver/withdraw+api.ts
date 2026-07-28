import { getSupabaseServerClient } from "@/lib/supabase-server";

const MIN_WITHDRAWAL = 50;
const COMMISSION = 0.1;
const CLEARING_HOURS = 24;

export async function POST(request: Request) {
  try {
    const { clerkId, amount } = await request.json();
    const requested = Number(amount);

    if (!clerkId || !Number.isFinite(requested)) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (requested < MIN_WITHDRAWAL) {
      return Response.json(
        { error: `Minimum withdrawal is R${MIN_WITHDRAWAL}` },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    const { data: userRow } = await supabase
      .from("users")
      .select("profile_data")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    const bank = userRow?.profile_data?.bank_account;
    if (!bank?.last4) {
      return Response.json(
        { error: "Add a bank account before withdrawing" },
        { status: 400 },
      );
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

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

    const { data, error } = await supabase
      .from("payouts")
      .insert({
        driver_id: driver.id,
        amount: requested,
        status: "pending",
        bank_last4: bank.last4,
      })
      .select()
      .single();

    if (error) throw error;

    // In production this is where a Stripe/Paystack transfer would be created.
    // For the project, payouts stay "pending" until marked paid by an admin.

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating withdrawal:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}