import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("hubs")
      .select("id, name, address, latitude, longitude, radius")
      .eq("status", "active")
      .order("name");

    if (error) {
      throw error;
    }

    return Response.json({ data: data ?? [] });
  } catch (error) {
    console.error("Error fetching hubs:", error);
    return Response.json({ error: "Unable to load hubs" }, { status: 500 });
  }
}
