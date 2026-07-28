import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // First, get the driver's ID from their clerk_id
    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, full_name, car_seats")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (driverError) {
      throw driverError;
    }

    if (!driver) {
      return Response.json({ data: [] }, { status: 200 });
    }

    // Fetch rides assigned to this driver with status 'booked'
    const { data, error } = await supabase
      .from("rides")
      .select(
        "ride_id, origin_address, destination_address, origin_latitude, origin_longitude, destination_latitude, destination_longitude, ride_time, fare_price, payment_status, created_at, user_id, status"
      )
      .eq("driver_id", driver.id)
      .eq("status", "booked")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const driverName = driver.full_name || "Driver";
    const nameParts = driverName.split(" ");

    const rideData = (data ?? []).map((ride: any) => ({
      ...ride,
      driver: {
        first_name: nameParts[0] || "Driver",
        last_name: nameParts.slice(1).join(" ") || "",
        car_seats: driver.car_seats ?? 7,
      },
    }));

    return Response.json({ data: rideData });
  } catch (error: any) {
    console.error("Error fetching ride requests:", error);

    const code = error?.code || error?.cause?.code;
    if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
      return Response.json({ data: [] }, { status: 200 });
    }

    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}