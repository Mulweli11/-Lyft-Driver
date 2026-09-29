import crypto from "node:crypto";

function shortenFloats(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(shortenFloats);
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [
        k,
        shortenFloats(x),
      ]),
    );
  }
  if (typeof v === "number" && !Number.isInteger(v) && v % 1 === 0) {
    return Math.trunc(v);
  }
  return v;
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    return Object.keys(v as object)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeys((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}

export async function POST(request: Request) {
  const raw = await request.text();
  const sig = request.headers.get("x-signature-v2") ?? "";
  const ts = Number(request.headers.get("x-timestamp"));

  // 1. Freshness (300s window)
  if (!ts || Math.abs(Date.now() / 1000 - ts) > 300) {
    return new Response("stale", { status: 401 });
  }

  // 2. Canonicalise
  const parsed = JSON.parse(raw);
  const canonical = JSON.stringify(sortKeys(shortenFloats(parsed)));

  // 3. Constant-time HMAC compare
  const expected = crypto
    .createHmac("sha256", process.env.DIDIT_WEBHOOK_SECRET!)
    .update(canonical, "utf8")
    .digest("hex");

  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return new Response("bad sig", { status: 401 });
  }

  const { status, vendor_data, decision, session_id } = parsed;

  // 4. Map Didit status → your DB status
  const statusMap: Record<string, string> = {
    Approved: "approved",
    Declined: "rejected",
    "In Review": "pending",
    "In Progress": "pending",
    "Awaiting User": "pending",
    Abandoned: "not_submitted",
    Expired: "not_submitted",
    "Kyc Expired": "not_submitted",
  };

  let mapped = statusMap[status];

  // 5. Check AML screening — if hits, force to review
  const amlResult = decision?.aml_screenings?.[0];
  const amlHit = (amlResult?.total_hits ?? 0) > 0;

  // 6. Check licence database validation — if failed, reject
  const licenceCheck = decision?.database_validations?.find(
    (d: any) => d.provider === "zaf_drivers_license",
  );
  const licenceFailed =
    licenceCheck && licenceCheck.status !== "Approved";

  if (mapped === "approved" && (amlHit || licenceFailed)) {
    mapped = "pending";
  }

  // 7. Pull ID data for storage
  const idData = decision?.id_verifications?.[0];
  const livenessData = decision?.liveness_checks?.[0];
  const faceMatchData = decision?.face_matches?.[0];

  if (mapped && vendor_data) {
    try {
      await fetch(`${process.env.API_BASE_URL}/(api)/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: vendor_data,
          driver_verification_status: mapped,
          driver_rejection_reason:
            status === "Declined"
              ? idData?.warnings?.join(", ") ?? "Verification declined"
              : licenceFailed
                ? "Driving licence could not be verified"
                : amlHit
                  ? "Flagged for manual review"
                  : null,
          didit_decision: decision ?? null,
          didit_session_id: session_id,
          didit_verified_at:
            mapped === "approved" ? new Date().toISOString() : null,
          first_name: idData?.first_name ?? null,
          last_name: idData?.last_name ?? null,
          id_number: idData?.document_number ?? null,
          date_of_birth: idData?.date_of_birth ?? null,
          id_citizenship: idData?.nationality ?? null,
          liveness_score: livenessData?.score ?? null,
          face_match_score: faceMatchData?.score ?? null,
          aml_hits: amlResult?.total_hits ?? 0,
          licence_verified: licenceCheck?.status === "Approved",
        }),
      });
    } catch (err) {
      console.error("Failed to update profile from webhook:", err);
    }
  }

  return new Response("ok");
}