import { getSupabaseServerClient } from "@/lib/supabase-server";

// Everything the driver home screen needs, in one request.

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("driver_verification_status, rating, profile_data")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (userError) throw userError;

    const base = {
      verification_status: userRow?.driver_verification_status ?? "not_submitted",
      is_online: Boolean(userRow?.profile_data?.is_online),
      rating: userRow?.rating ?? 5,
      today_earnings: 0,
      today_trips: 0,
      pending_requests: 0,
      next_trip: null as any,
    };

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    // A driver row may not exist until verification — the dashboard still
    // renders, it just has nothing to count.
    if (!driver) return Response.json({ data: base });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [completedToday, pending, next] = await Promise.all([
      supabase
        .from("rides")
        .select("fare_price")
        .eq("driver_id", driver.id)
        .eq("status", "completed")
        .gte("completed_at", startOfDay.toISOString()),
      supabase
        .from("rides")
        .select("ride_id", { count: "exact", head: true })
        .eq("driver_id", driver.id)
        .eq("status", "booked"),
      supabase
        .from("rides")
        .select(
          "ride_id, origin_address, destination_address, scheduled_for, seats_booked",
        )
        .eq("driver_id", driver.id)
        .in("status", ["accepted", "in_progress"])
        .gte("scheduled_for", new Date(Date.now() - 2 * 3600_000).toISOString())
        .order("scheduled_for", { ascending: true })
        .limit(1),
    ]);

    const gross = (completedToday.data ?? []).reduce(
      (sum: number, r: any) => sum + (r.fare_price ?? 0),
      0,
    );

    return Response.json({
      data: {
        ...base,
        // fare_price is stored in cents; drivers keep 90%
        today_earnings: (gross * 0.9) / 100,
        today_trips: (completedToday.data ?? []).length,
        pending_requests: pending.count ?? 0,
        next_trip: next.data?.[0]
          ? { ...next.data[0], seats_booked: next.data[0].seats_booked ?? 1 }
          : null,
      },
    });
  } catch (error) {
    console.error("Error building dashboard:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}