import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    console.log("========== CREATE USER ==========");

    const supabase = await getSupabaseServerClient();
    const body = await request.json();

    console.log("Request Body:", body);

    const { name, first_name, last_name, email, clerkId } = body;

    if ((!name && !first_name && !last_name) || !email || !clerkId) {
      return Response.json(
        {
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    const { data: existingUser, error: existingError } = await supabase
      .from("drivers")
      .select("*")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingUser) {
      console.log("User already exists");

      return Response.json(
        {
          message: "User already exists",
          data: existingUser,
        },
        { status: 200 }
      );
    }

    const firstName =
      typeof first_name === "string" && first_name.trim().length > 0
        ? first_name.trim()
        : typeof name === "string"
        ? name.trim().split(/\s+/)[0] || null
        : null;

    const lastName =
      typeof last_name === "string" && last_name.trim().length > 0
        ? last_name.trim()
        : typeof name === "string"
        ? name.trim().split(/\s+/).slice(1).join(" ") || null
        : null;

    const fullName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim()
        : [firstName, lastName].filter(Boolean).join(" ") || null;

    const { data, error } = await supabase
      .from("drivers")
      .insert({
        email,
        clerk_id: clerkId,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        status: "pending",
        verified: false,
        profile_data: {},
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return Response.json(
      {
        success: true,
        data,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("USER API ERROR:");
    console.error(error);

    return Response.json(
      {
        success: false,
        error: String(error),
      },
      {
        status: 500,
      }
    );
  }
}