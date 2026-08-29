import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const { data: drivers, error: driverError } = await supabase
      .from("drivers")
      .select("id")
      .eq("clerk_id", clerkId)
      .limit(1);

    if (driverError) throw driverError;

    const driver = drivers?.[0];
    if (!driver) {
      return Response.json({ data: [] });
    }

    const { data, error } = await supabase
      .from("offer_trip")
      .select("*")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return Response.json({ data: data ?? [] });
  } catch (error) {
    const details =
      error instanceof Error
        ? error.message
        : JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2);
    console.error("Error fetching driver trip:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details,
      },
      { status: 500 },
    );
  }
}
