import { requireClerkUser } from "@/lib/server-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// A trip is the driver's OFFER (route, departure, seats, price).
// A ride is a passenger's booking against it. Separate tables, because one
// trip can hold several bookings.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      origin_address,
      origin_latitude,
      origin_longitude,
      destination_address,
      destination_latitude,
      destination_longitude,
      departure_at,
      seats_total,
      price_per_seat,
      repeat_days,
    } = body;

    if (
      !origin_address ||
      !destination_address ||
      origin_latitude == null ||
      origin_longitude == null ||
      destination_latitude == null ||
      destination_longitude == null ||
      !departure_at ||
      !seats_total ||
      !price_per_seat
    ) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const clerkId = await requireClerkUser(request);

    let { data: driver } = await supabase
      .from("drivers")
      .select("id, verified, status")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    // First trip ever: create the driver row from their profile and carry over the
    // existing verification state if it has already been set on the user record.
    if (!driver) {
      const { data: profile } = await supabase
        .from("users")
        .select("name, profile_image_url, profile_data, status, verified")
        .eq("clerk_id", clerkId)
        .maybeSingle();

      const [first, ...rest] = String(profile?.name ?? "Driver").split(" ");
      const { data: created, error: createError } = await supabase
        .from("drivers")
        .insert({
          clerk_id: clerkId,
          first_name: first,
          last_name: rest.join(" "),
          profile_image_url: profile?.profile_image_url ?? null,
          car_seats: profile?.profile_data?.vehicle?.seats ?? seats_total,
          rating: 5,
          status: typeof profile?.status === "string" ? profile.status : "pending",
          verified: typeof profile?.verified === "boolean" ? profile.verified : false,
          profile_data: profile?.profile_data ?? {},
        })
        .select("id, verified, status")
        .single();

      if (createError) throw createError;
      driver = created;
    }

    const driverVerificationStatus =
      driver?.verified === true ? "approved" : driver?.status ?? "not_submitted";

    if (
      driverVerificationStatus !== "approved" &&
      driver?.verified !== true &&
      driver?.status !== "approved"
    ) {
      return Response.json(
        { error: "Finish driver verification before publishing trips" },
        { status: 403 },
      );
    }

    const { data: existingActiveTrip, error: existingTripError } = await supabase
      .from("offer_trip")
      .select("id")
      .eq("driver_id", driver.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (existingTripError && existingTripError.code !== "PGRST116") {
      throw existingTripError;
    }

    if (existingActiveTrip) {
      return Response.json(
        {
          error:
            "You already have an active trip. Edit your current trip instead of creating another one.",
        },
        { status: 409 },
      );
    }

    const departureDate = new Date(departure_at);
    const pad = (value: number) => String(value).padStart(2, "0");
    const departureDateValue = `${departureDate.getFullYear()}-${pad(
      departureDate.getMonth() + 1,
    )}-${pad(departureDate.getDate())}`;
    const departureTimeValue = `${pad(departureDate.getHours())}:${pad(
      departureDate.getMinutes(),
    )}:${pad(departureDate.getSeconds())}`;

    const { data, error } = await supabase
      .from("offer_trip")
      .insert({
        driver_id: driver.id,
        leaving_from: origin_address,
        going_to: destination_address,
        leaving_from_lat: origin_latitude,
        leaving_from_lng: origin_longitude,
        going_to_lat: destination_latitude,
        going_to_lng: destination_longitude,
        departure_date: departureDateValue,
        departure_time: departureTimeValue,
        repeat_weekly: Array.isArray(repeat_days) && repeat_days.length > 0,
        repeat_days: Array.isArray(repeat_days) ? repeat_days : [],
        seats_available: seats_total,
        seats_booked: 0,
        price_per_seat,
        service_fee_percentage: 10.0,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    const details =
      error instanceof Error
        ? error.message
        : JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2);
    console.error("Error creating trip:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details,
      },
      { status: 500 },
    );
  }
}