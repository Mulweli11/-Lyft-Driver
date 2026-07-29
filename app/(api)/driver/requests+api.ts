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

    const supabase = await getSupabaseServerClient();

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (driverError) throw driverError;

    // Not an error — a newly registered driver simply has no record yet.
    if (!driver) return Response.json({ data: [] });

    const { data: rides, error } = await supabase
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
         user_id`,
      )
      .eq("driver_id", driver.id)
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const ridesList = rides ?? [];
    const passengerIds = Array.from(
      new Set(
        ridesList
          .map((ride: any) => String(ride.user_id ?? "").trim())
          .filter(Boolean),
      ),
    );

    let passengersByClerkId: Record<string, any> = {};
    if (passengerIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select(
          "clerk_id, name, phone_number, profile_image_url, rating, verification_status",
        )
        .in("clerk_id", passengerIds);

      if (usersError) throw usersError;

      passengersByClerkId = (users ?? []).reduce(
        (acc: Record<string, any>, user: any) => {
          if (user?.clerk_id) {
            acc[String(user.clerk_id)] = user;
          }
          return acc;
        },
        {},
      );
    }

    const response = ridesList.map((ride: any) => {
      const passenger = passengersByClerkId[String(ride.user_id ?? "")];
      const full = String(passenger?.name ?? "").trim();
      const [first, ...rest] = full.split(" ");

      return {
        ...ride,
        status: ride.status ?? "booked",
        seats_booked: ride.seats_booked ?? 1,
        passenger: passenger
          ? {
              first_name: first || "Passenger",
              last_name: rest.join(" "),
              phone_number: passenger.phone_number,
              profile_image_url: passenger.profile_image_url,
              rating: passenger.rating,
              verification_status: passenger.verification_status,
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