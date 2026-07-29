import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: rides, error } = await supabase
      .from("rides")
      .select("*, drivers(first_name, last_name)")
      .eq("user_id", clerkId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    const completedTrips = (rides ?? []).filter((ride: any) => ride.payment_status === "paid").length;
    const cancelledTrips = (rides ?? []).filter((ride: any) => ride.payment_status === "cancelled").length;
    const moneySpent = (rides ?? []).reduce((sum: number, ride: any) => sum + Number(ride.fare_price || 0), 0);
    const favoriteDriver = rides?.[0]?.drivers?.first_name && rides?.[0]?.drivers?.last_name
      ? `${rides[0].drivers.first_name} ${rides[0].drivers.last_name}`
      : "Not available";
    const lastRide = rides?.[0]?.destination_address || "No rides yet";

    return Response.json({
      data: {
        completed_trips: completedTrips,
        cancelled_trips: cancelledTrips,
        money_spent: moneySpent,
        favorite_driver: favoriteDriver,
        last_ride: lastRide,
      },
    });
  } catch (error) {
    console.error("Error fetching ride summary:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clerkId,
      driver_id,
      origin_address,
      origin_latitude,
      origin_longitude,
      destination_address,
      destination_latitude,
      destination_longitude,
      scheduled_for,
      ride_time,
      fare_price,
      payment_status,
      payment_method,
      stripe_payment_id,
      seats_booked,
      duration_minutes,
    } = body;

    if (
      !clerkId ||
      !driver_id ||
      !origin_address ||
      origin_latitude == null ||
      origin_longitude == null ||
      !destination_address ||
      destination_latitude == null ||
      destination_longitude == null ||
      fare_price == null
    ) {
      return Response.json({ error: "Missing required booking fields" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("id", driver_id)
      .maybeSingle();

    if (driverError) throw driverError;
    if (!driver) {
      return Response.json({ error: "Driver not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("rides")
      .insert({
        origin_address,
        origin_latitude,
        origin_longitude,
        destination_address,
        destination_latitude,
        destination_longitude,
        scheduled_for: scheduled_for ?? new Date().toISOString(),
        ride_time: ride_time ?? scheduled_for ?? new Date().toISOString(),
        fare_price,
        payment_status: payment_status ?? "paid",
        payment_method: payment_method ?? "Mock Card",
        stripe_payment_id: stripe_payment_id ?? null,
        driver_id,
        user_id: clerkId,
        seats_booked: seats_booked ?? 1,
        duration_minutes: duration_minutes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating ride booking:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
