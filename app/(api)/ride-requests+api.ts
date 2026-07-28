import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId || !supabaseUrl || !supabaseAnonKey) {
      return Response.json({ data: [] });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id, full_name, car_seats")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (!driver) {
      return Response.json({ data: [] });
    }

    const { data: rides } = await supabase
      .from("rides")
      .select("ride_id, origin_address, destination_address, origin_latitude, origin_longitude, destination_latitude, destination_longitude, ride_time, fare_price, payment_status, created_at, user_id, status")
      .eq("driver_id", driver.id)
      .eq("status", "booked")
      .order("created_at", { ascending: false });

    const nameParts = (driver.full_name || "Driver").split(" ");
    const rideData = (rides ?? []).map((ride: any) => ({
      ...ride,
      driver: {
        first_name: nameParts[0] || "Driver",
        last_name: nameParts.slice(1).join(" ") || "",
        car_seats: driver.car_seats ?? 7,
      },
    }));

    return Response.json({ data: rideData });
  } catch {
    return Response.json({ data: [] });
  }
}