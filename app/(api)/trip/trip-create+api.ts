import { getSupabaseServerClient } from "@/lib/supabase-server";

// A trip is the driver's OFFER (route, departure, seats, price).
// A ride is a passenger's booking against it. Separate tables, because one
// trip can hold several bookings.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      clerkId,
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
      !clerkId ||
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

    const supabase = getSupabaseServerClient();

    // Only approved drivers may publish — the whole safety model rests here.
    const { data: userRow } = await supabase
      .from("users")
      .select("driver_verification_status")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (userRow?.driver_verification_status !== "approved") {
      return Response.json(
        { error: "Finish driver verification before publishing trips" },
        { status: 403 },
      );
    }

    let { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    // First trip ever: create the driver row from their profile
    if (!driver) {
      const { data: profile } = await supabase
        .from("users")
        .select("name, profile_image_url, profile_data")
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
        })
        .select("id")
        .single();

      if (createError) throw createError;
      driver = created;
    }

    const { data, error } = await supabase
      .from("trips")
      .insert({
        driver_id: driver.id,
        origin_address,
        origin_latitude,
        origin_longitude,
        destination_address,
        destination_latitude,
        destination_longitude,
        departure_at,
        seats_total,
        seats_available: seats_total,
        price_per_seat,
        repeat_days: repeat_days ?? [],
        status: "published",
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}