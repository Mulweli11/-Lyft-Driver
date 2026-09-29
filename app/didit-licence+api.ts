export async function POST(request: Request) {
  try {
    const { nationalId, lastName, initials, licenceNumber, clerkId } = await request.json();

    const formData = new FormData();
    formData.append("issuing_state", "ZAF");
    formData.append("services", "zaf_drivers_license");
    formData.append("national_id", nationalId);
    formData.append("last_name", lastName);
    formData.append("initials", initials);
    formData.append("licence_number", licenceNumber);
    formData.append("vendor_data", clerkId);

    const res = await fetch("https://verification.didit.me/v3/database-validation/", {
      method: "POST",
      headers: { "x-api-key": process.env.DIDIT_API_KEY! },
      body: formData,
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json({ error: "licence_check_failed", detail }, { status: 502 });
    }

    const result = await res.json();
    return Response.json({ data: result });
  } catch (error: any) {
    return Response.json({ error: "server_error", detail: error?.message }, { status: 500 });
  }
}