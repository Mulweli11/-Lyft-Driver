import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { nationalId, lastName, initials, licenceNumber, clerkId } =
      await request.json();

    if (!nationalId || !lastName || !initials || !licenceNumber || !clerkId) {
      return Response.json(
        {
          error: "missing_fields",
          message:
            "Please provide National ID, Last Name, Initials, Licence Number, and Clerk ID.",
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
      `DIDIT LICENCE: verifying licence for ${clerkId} (${lastName}, ${initials}, ${licenceNumber})`,
    );

    const formData = new FormData();
    formData.append("issuing_state", "ZAF");
    formData.append("services", "zaf_drivers_license");
    formData.append("national_id", nationalId.trim());
    formData.append("last_name", lastName.trim());
    formData.append("initials", initials.trim().toUpperCase());
    formData.append("licence_number", licenceNumber.trim());
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
      console.warn("DIDIT LICENCE: request failed", res.status, detail);
      return Response.json(
        {
          error: "licence_check_failed",
          message:
            "Could not verify licence with the NATIS register. Please double-check your details.",
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
      `DIDIT LICENCE: result status=${dbValidation?.status}, match_score=${matchScore}`,
    );

    if (!isApproved) {
      const warnings = dbValidation?.warnings ?? [];
      const reason =
        warnings.length > 0
          ? warnings.join(". ")
          : "The licence number, initials, or ID did not match NATIS records.";

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

    // Fetch existing profile_data
    const { data: currentDriver } = await supabase
      .from("drivers")
      .select(
        "profile_data, id_verified, passport_verified, driver_verification_status",
      )
      .eq("clerk_id", clerkId)
      .maybeSingle();

    const existingProfileData =
      currentDriver?.profile_data && typeof currentDriver.profile_data === "object"
        ? currentDriver.profile_data
        : {};

    const updatedProfileData = {
      ...existingProfileData,
      licence: {
        licence_number: licenceNumber.trim(),
        initials: initials.trim().toUpperCase(),
        last_name: lastName.trim(),
        verified_at: new Date().toISOString(),
        validation_id: result.request_id,
        match_score: matchScore,
      },
    };

    const hasIdentityVerified =
      currentDriver?.id_verified === true ||
      currentDriver?.passport_verified === true;

    const updatePayload: Record<string, any> = {
      licence_verified: true,
      profile_data: updatedProfileData,
    };

    // If both identity and licence are verified, advance overall status
    if (hasIdentityVerified) {
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
      console.error("DIDIT LICENCE: error updating database", updateError);
      return Response.json(
        { error: "database_update_failed", detail: updateError.message },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      verified: true,
      message: "Driving licence successfully verified with the NATIS register.",
      data: updatedDriver,
      validation: result,
    });
  } catch (error: any) {
    console.error("DIDIT LICENCE: server error", error);
    return Response.json(
      { error: "server_error", detail: error?.message },
      { status: 500 },
    );
  }
}
