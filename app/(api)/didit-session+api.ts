// Workflow: "KYC + AML" — includes ID, Liveness, Face Match, IP, AML
const WORKFLOW_ID = "57368fe7-f4dc-487f-bebe-981305685d81";

export async function POST(request: Request) {
  try {
    console.log("DIDIT SESSION: request received");
    const { clerkId } = await request.json();

    if (!clerkId) {
      return Response.json({ error: "clerkId is required" }, { status: 400 });
    }

    console.log("DIDIT SESSION: creating for", clerkId);

    const res = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "x-api-key": process.env.DIDIT_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: WORKFLOW_ID,
        vendor_data: clerkId,
        callback: "https://lyft-driver.expo.app/verification-done",
        callback_method: "both",
        metadata: { clerkId },
      }),
    });

    console.log("DIDIT SESSION: status", res.status);

    if (!res.ok) {
      const detail = await res.text();
      console.error("Didit session create failed:", detail);
      return Response.json(
        { error: "session_create_failed", detail },
        { status: 502 },
      );
    }

    const session = await res.json();

    return Response.json({
      data: {
        url: session.url,
        session_id: session.session_id,
        session_token: session.session_token,
      },
    });
  } catch (error: any) {
    console.error("Didit session error:", error);
    return Response.json(
      { error: "server_error", detail: error?.message },
      { status: 500 },
    );
  }
}