import { getSupabaseServerClient } from "@/lib/supabase-server";

// Bookings made against this driver's trips, newest first.
// The driver is identified by their Clerk ID; drivers.clerk_id maps that to
// the numeric driver_id stored on rides.

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (driverError) throw driverError;

    // Not an error — a newly registered driver simply has no record yet.
    if (!driver) return Response.json({ data: [] });

    const { data, error } = await supabase
      .from("rides")
      .select(
        `ride_id,
         origin_address,
         destination_address,
         origin_latitude,
         origin_longitude,
         destination_latitude,
         destination_longitude,
         ride_time,
         duration_minutes,
         scheduled_for,
         status,
         seats_booked,
         fare_price,
         payment_status,
         created_at,
         completed_at,
         cancelled_at,
         user_id,
         passenger:users!rides_user_id_fkey(
           name, phone_number, profile_image_url, rating, verification_status
         )`,
      )
      .eq("driver_id", driver.id)
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const response = (data ?? []).map((ride: any) => {
      const full = String(ride.passenger?.name ?? "").trim();
      const [first, ...rest] = full.split(" ");

      return {
        ...ride,
        status: ride.status ?? "booked",
        seats_booked: ride.seats_booked ?? 1,
        passenger: ride.passenger
          ? {
              first_name: first || "Passenger",
              last_name: rest.join(" "),
              phone_number: ride.passenger.phone_number,
              profile_image_url: ride.passenger.profile_image_url,
              rating: ride.passenger.rating,
              verification_status: ride.passenger.verification_status,
            }
          : null,
      };
    });

    return Response.json({ data: response });
  } catch (error: any) {
    console.error("Error fetching driver requests:", error);

    const code = error?.code || error?.cause?.code;
    if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
      return Response.json({ data: [] }, { status: 200 });
    }

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}