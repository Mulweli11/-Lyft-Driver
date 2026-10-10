import { getSupabaseServerClient } from "@/lib/supabase-server";

type Method = "bank" | "voucher" | "cash";

export async function POST(request: Request) {
  try {
    const { clerkId, amount, method = "bank" } = (await request.json()) as {
      clerkId: string;
      amount: number;
      method?: Method;
    };

    const requested = Number(amount);

    if (!clerkId || !Number.isFinite(requested)) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const { data: userRow } = await supabase
      .from("users")
      .select("profile_data")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    const bankLast4 = userRow?.profile_data?.bank_account?.last4 ?? null;

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (driverError) throw driverError;

    if (!driver) {
      return Response.json({ error: "Driver record not found" }, { status: 404 });
    }

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
        is_mock: true,
        bank_last4: method === "bank" ? bankLast4 : null,
        reference_code: code,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("mock-withdraw error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}