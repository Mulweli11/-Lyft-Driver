import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { nationalId, firstName, lastName, dateOfBirth, clerkId } =
      await request.json();

    if (!nationalId || !firstName || !lastName || !dateOfBirth || !clerkId) {
      return Response.json(
        {
          error: "missing_fields",
          message:
            "Please provide National ID, First Name, Last Name, Date of Birth, and Clerk ID.",
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.DIDIT_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "DIDIT_API_KEY not configured" },
        { status: 500 },
      );
    }

    console.log(
      `DIDIT SA ID: validating ID for ${clerkId} (${firstName} ${lastName}, ID: ${nationalId}, DOB: ${dateOfBirth})`,
    );

    const formData = new FormData();
    formData.append("issuing_state", "ZAF");
    formData.append("services", "zaf_africa_national_id");
    formData.append("national_id", nationalId.trim());
    formData.append("first_name", firstName.trim());
    formData.append("last_name", lastName.trim());
    formData.append("date_of_birth", dateOfBirth.trim());
    formData.append("vendor_data", clerkId);

    const res = await fetch(
      "https://verification.didit.me/v3/database-validation/",
      {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: formData,
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.warn("DIDIT SA ID: validation request failed", res.status, detail);
      return Response.json(
        {
          error: "id_validation_failed",
          message:
            "Could not verify ID with Home Affairs. Please verify the ID number and birth date.",
          detail,
        },
        { status: 502 },
      );
    }

    const result = await res.json();
    const dbValidation = result?.database_validation;
    const isApproved = dbValidation?.status === "Approved";
    const matchScore = dbValidation?.match_score ?? 0;

    console.log(
      `DIDIT SA ID: status=${dbValidation?.status}, match_score=${matchScore}`,
    );

    if (!isApproved) {
      const warnings = dbValidation?.warnings ?? [];
      const reason =
        warnings.length > 0
          ? warnings.join(". ")
          : "The provided ID number or names did not match Home Affairs records.";

      return Response.json(
        {
          success: false,
          verified: false,
          message: reason,
          data: result,
        },
        { status: 200 },
      );
    }

    // Update Supabase
    const supabase = await getSupabaseServerClient();

    const { data: currentDriver } = await supabase
      .from("drivers")
      .select("licence_verified, driver_verification_status")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    const hasLicenceVerified = currentDriver?.licence_verified === true;

    const updatePayload: Record<string, any> = {
      id_verified: true,
      id_number: nationalId.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      date_of_birth: dateOfBirth.trim(),
      id_citizenship: "ZAF",
      didit_verified_at: new Date().toISOString(),
    };

    if (hasLicenceVerified) {
      updatePayload.driver_verification_status = "approved";
      updatePayload.verified = true;
      updatePayload.status = "approved";
    }

    const { data: updatedDriver, error: updateError } = await supabase
      .from("drivers")
      .update(updatePayload)
      .eq("clerk_id", clerkId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("DIDIT SA ID: error updating database", updateError);
      return Response.json(
        { error: "database_update_failed", detail: updateError.message },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      verified: true,
      message: "South African ID successfully verified with Home Affairs.",
      data: updatedDriver,
      validation: result,
    });
  } catch (error: any) {
    console.error("DIDIT SA ID: server error", error);
    return Response.json(
      { error: "server_error", detail: error?.message },
      { status: 500 },
    );
  }
}
