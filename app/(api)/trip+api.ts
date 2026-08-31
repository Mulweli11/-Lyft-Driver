import { requireClerkUser } from "@/lib/server-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = await requireClerkUser(request);

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
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return Response.json({ data: data ?? [] });
  } catch (error) {
    if (error instanceof Response) return error;
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
