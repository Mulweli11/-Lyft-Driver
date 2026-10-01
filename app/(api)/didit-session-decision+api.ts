import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const { sessionId, clerkId, docType } = await request.json();

    if (!sessionId || !clerkId) {
      return Response.json(
        { error: "sessionId and clerkId are required" },
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

    console.log(`DIDIT DECISION: fetching decision for session ${sessionId} (docType: ${docType})`);

    const res = await fetch(
      `https://verification.didit.me/v3/session/${sessionId}/decision/`,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.warn("DIDIT DECISION: failed to fetch decision", res.status, text);
      return Response.json(
        { error: "decision_fetch_failed", detail: text },
        { status: res.status },
      );
    }

    const decisionData = await res.json();
    const sessionStatus = decisionData?.status; // e.g. "Approved", "Declined", "In Review", "In Progress"
    console.log(`DIDIT DECISION: session status is "${sessionStatus}"`);

    const supabase = await getSupabaseServerClient();

    const idData = decisionData?.id_verifications?.[0];
    const livenessData = decisionData?.liveness_checks?.[0];
    const faceMatchData = decisionData?.face_matches?.[0];
    const amlResult = decisionData?.aml_screenings?.[0];
    const dbValidations = decisionData?.database_validations;

    const isApproved = sessionStatus === "Approved";
    const isDeclined = sessionStatus === "Declined";
    const isInReview = sessionStatus === "In Review" || sessionStatus === "In Progress";

    const updatePayload: Record<string, any> = {
      didit_session_id: sessionId,
      didit_decision: decisionData,
      didit_verified_at: isApproved ? new Date().toISOString() : null,
    };

    if (livenessData?.score !== undefined) {
      updatePayload.liveness_score = livenessData.score;
    }
    if (faceMatchData?.score !== undefined) {
      updatePayload.face_match_score = faceMatchData.score;
    }
    if (amlResult?.total_hits !== undefined) {
      updatePayload.aml_hits = amlResult.total_hits;
    }

    // Determine what document was verified
    const rawDocType = idData?.document_type?.toLowerCase() ?? "";
    const isPassport =
      docType === "passport" ||
      rawDocType.includes("passport");

    if (isApproved) {
      if (isPassport) {
        updatePayload.passport_verified = true;
        if (idData?.document_number) {
          updatePayload.passport_number = idData.document_number;
        }
      } else {
        updatePayload.id_verified = true;
        if (idData?.document_number || idData?.personal_number) {
          updatePayload.id_number = idData.document_number || idData.personal_number;
        }
      }

      if (idData?.date_of_birth) {
        updatePayload.date_of_birth = idData.date_of_birth;
      }
      if (idData?.nationality) {
        updatePayload.id_citizenship = idData.nationality;
      }
      if (idData?.first_name) {
        updatePayload.first_name = idData.first_name;
      }
      if (idData?.last_name) {
        updatePayload.last_name = idData.last_name;
      }
    } else if (isDeclined) {
      const reason =
        idData?.warnings?.join(", ") ||
        decisionData?.fraud_check?.warnings?.join(", ") ||
        "Verification was declined";
      updatePayload.driver_rejection_reason = reason;
    }

    // Fetch existing driver row to check full verification status
    const { data: currentDriver } = await supabase
      .from("drivers")
      .select("id_verified, passport_verified, licence_verified, status")
      .eq("clerk_id", clerkId)
      .maybeSingle();

    const willHaveIdVerified = isApproved && !isPassport ? true : (currentDriver?.id_verified ?? false);
    const willHavePassportVerified = isApproved && isPassport ? true : (currentDriver?.passport_verified ?? false);
    const hasLicenceVerified = currentDriver?.licence_verified ?? false;

    // If both identity and licence are verified, consider advancing driver verification status
    if ((willHaveIdVerified || willHavePassportVerified) && hasLicenceVerified) {
      updatePayload.driver_verification_status = "approved";
      updatePayload.verified = true;
      updatePayload.status = "approved";
    } else if (isApproved) {
      // Driver has completed identity check, status can be pending further docs or in review
      if (!currentDriver?.status || currentDriver.status === "not_submitted") {
        updatePayload.driver_verification_status = "pending";
      }
    }

    const { data: updatedDriver, error: updateError } = await supabase
      .from("drivers")
      .update(updatePayload)
      .eq("clerk_id", clerkId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("DIDIT DECISION: error updating driver row", updateError);
      return Response.json(
        { error: "database_update_failed", detail: updateError.message },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      status: sessionStatus,
      isApproved,
      isDeclined,
      isInReview,
      data: updatedDriver,
      decision: decisionData,
    });
  } catch (error: any) {
    console.error("DIDIT DECISION: internal server error", error);
    return Response.json(
      { error: "server_error", detail: error?.message },
      { status: 500 },
    );
  }
}
