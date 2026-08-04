import { getSupabaseServerClient } from "@/lib/supabase-server";

function resolveDriverVerificationStatus(driver: any) {
  if (driver?.driver_verification_status) {
    return driver.driver_verification_status;
  }

  if (driver?.verified === true) {
    return "approved";
  }

  if (driver?.status === "approved") {
    return "approved";
  }

  if (driver?.status === "pending") {
    return "pending";
  }

  if (driver?.status === "rejected") {
    return "rejected";
  }

  return "not_submitted";
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized === "") return null;
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clerkId = url.searchParams.get("clerkId");

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: profile, error } = await supabase
      .from("drivers")
      .select(
        "id, full_name, email, phone_number, clerk_id, profile_image_url, rating, total_trips, verification_percentage, profile_data, car_seats, is_online, latitude, longitude, last_location_update, status, verified",
      )
      .eq("clerk_id", clerkId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const driverVerificationStatus = resolveDriverVerificationStatus(profile);

    return Response.json({
      data: profile
        ? {
            ...profile,
            name: profile.full_name ?? null,
            profile_data: profile.profile_data ?? {},
            driver_verification_status: driverVerificationStatus,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clerkId, profile_data, ...updates } = body;

    if (!clerkId) {
      return Response.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const profilePayload =
      profile_data && typeof profile_data === "object" ? profile_data : undefined;

    const updatePayload: Record<string, unknown> = {};

    if (profilePayload) {
      updatePayload.profile_data = {
        ...profilePayload,
      };
    }

    if (typeof updates.name !== "undefined") {
      updatePayload.full_name = updates.name;
    }

    if (typeof updates.email !== "undefined") {
      updatePayload.email = updates.email;
    }

    if (typeof updates.profile_image_url !== "undefined") {
      updatePayload.profile_image_url = updates.profile_image_url;
    }

    if (typeof updates.phone_number !== "undefined") {
      updatePayload.phone_number = updates.phone_number;
    }

    if (typeof updates.rating !== "undefined") {
      updatePayload.rating = parseNumber(updates.rating);
    }

    if (typeof updates.total_trips !== "undefined") {
      updatePayload.total_trips = parseNumber(updates.total_trips);
    }

    if (typeof updates.verification_percentage !== "undefined") {
      updatePayload.verification_percentage = parseNumber(updates.verification_percentage);
    }

    if (typeof updates.car_seats !== "undefined") {
      updatePayload.car_seats = parseNumber(updates.car_seats);
    }

    if (typeof updates.is_online !== "undefined") {
      updatePayload.is_online = updates.is_online;
    }

    if (typeof updates.latitude !== "undefined") {
      updatePayload.latitude = parseNumber(updates.latitude);
    }

    if (typeof updates.longitude !== "undefined") {
      updatePayload.longitude = parseNumber(updates.longitude);
    }

    if (typeof updates.last_location_update !== "undefined") {
      updatePayload.last_location_update = updates.last_location_update;
    }

    if (typeof updates.status !== "undefined") {
      updatePayload.status = updates.status;
    }

    if (typeof updates.verified !== "undefined") {
      updatePayload.verified = updates.verified;
    }

    if (typeof updates.driver_verification_status !== "undefined") {
      updatePayload.driver_verification_status = updates.driver_verification_status;
    }

    if (typeof updates.driver_rejection_reason !== "undefined") {
      updatePayload.driver_rejection_reason = updates.driver_rejection_reason;
    }

    if (typeof updates.driver_submitted_at !== "undefined") {
      updatePayload.driver_submitted_at = updates.driver_submitted_at;
    }

    const { data: updatedDriver, error: updateError } = await supabase
      .from("drivers")
      .update(updatePayload)
      .eq("clerk_id", clerkId)
      .select()
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    const resultData =
      updatedDriver ??
      (
        await supabase
          .from("drivers")
          .insert(
            {
              clerk_id: clerkId,
              full_name: typeof updates.name === "string" ? updates.name : "Driver",
              email: typeof updates.email === "string" ? updates.email : null,
              phone_number:
                typeof updates.phone_number === "string"
                  ? updates.phone_number
                  : null,
              profile_image_url:
                typeof updates.profile_image_url === "string"
                  ? updates.profile_image_url
                  : null,
              rating: parseNumber(updates.rating),
              total_trips: parseNumber(updates.total_trips),
              verification_percentage: parseNumber(updates.verification_percentage),
              car_seats: parseNumber(updates.car_seats),
              is_online: typeof updates.is_online === "boolean" ? updates.is_online : false,
              latitude: parseNumber(updates.latitude),
              longitude: parseNumber(updates.longitude),
              last_location_update:
                typeof updates.last_location_update === "string"
                  ? updates.last_location_update
                  : null,
              status:
                typeof updates.status === "string" ? updates.status : "pending",
              verified:
                typeof updates.verified === "boolean" ? updates.verified : false,
              driver_verification_status:
                typeof updates.driver_verification_status === "string"
                  ? updates.driver_verification_status
                  : null,
              driver_rejection_reason:
                typeof updates.driver_rejection_reason === "string"
                  ? updates.driver_rejection_reason
                  : null,
              driver_submitted_at:
                typeof updates.driver_submitted_at === "string"
                  ? updates.driver_submitted_at
                  : null,
              profile_data: profilePayload ?? {},
            },
          )
          .select()
          .single()
      ).data;

    return Response.json({
      data: resultData
        ? {
            ...resultData,
            name: resultData.full_name ?? null,
          }
        : null,
    });

    if (result.error) {
      throw result.error;
    }

    return Response.json({
      data: result.data
        ? {
            ...result.data,
            name: result.data.full_name ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return Response.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
