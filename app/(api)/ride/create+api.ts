import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      origin_address,
      destination_address,
      origin_latitude,
      origin_longitude,
      destination_latitude,
      destination_longitude,
      ride_time,
      fare_price,
      payment_status,
      payment_method,
      stripe_payment_id,
      driver_id,
      user_id,
    } = body;

    const rideTimeNumber = typeof ride_time === "number" ? ride_time : Number(ride_time);
    const farePriceNumber = Number(fare_price);
    const rideTimeAsTimestamp = Number.isFinite(rideTimeNumber)
      ? new Date(Date.now() + rideTimeNumber * 60000).toISOString()
      : typeof ride_time === "string"
      ? new Date(ride_time).toISOString()
      : null;

    if (
      !origin_address ||
      !destination_address ||
      origin_latitude === undefined ||
      origin_longitude === undefined ||
      destination_latitude === undefined ||
      destination_longitude === undefined ||
      !rideTimeAsTimestamp ||
      Number.isNaN(farePriceNumber) ||
      !payment_status ||
      !driver_id ||
      !user_id
    ) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("rides")
      .insert({
        origin_address,
        destination_address,
        origin_latitude,
        origin_longitude,
        destination_latitude,
        destination_longitude,
        ride_time: rideTimeAsTimestamp,
        fare_price: farePriceNumber,
        payment_status,
        payment_method: payment_method ?? "Mock Card",
        stripe_payment_id: stripe_payment_id ?? null,
        driver_id,
        user_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return Response.json(
        {
          error: error.message || "Supabase insert error",
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    return Response.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error inserting data into recent_rides:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
