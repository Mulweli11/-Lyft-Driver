import { getSupabaseServerClient } from "@/lib/supabase-server";

// GET  — one ride
// PATCH — move it through the trip lifecycle:
//   accept   booked      → accepted
//   decline  booked      → cancelled
//   start    accepted    → in_progress
//   complete in_progress → completed
//
// Transitions are validated server-side. Without that, a stale screen could
// complete a trip that was never accepted.

const TRANSITIONS: Record<string, { from: string[]; to: string }> = {
  accept: { from: ["booked"], to: "accepted" },
  decline: { from: ["booked", "accepted"], to: "cancelled" },
  start: { from: ["accepted"], to: "in_progress" },
  complete: { from: ["in_progress"], to: "completed" },
};

export async function GET(request: Request, { id }: { id: string }) {
  if (!id) {
    return Response.json({ error: "Missing ride id" }, { status: 400 });
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { data, error } = await supabase
      .from("rides")
      .select("*")
      .eq("ride_id", id)
      .maybeSingle();

    if (error) throw error;
    return Response.json({ data });
  } catch (error) {
    console.error("Error fetching ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { id }: { id: string }) {
  if (!id) {
    return Response.json({ error: "Missing ride id" }, { status: 400 });
  }

  try {
    const { action, reason } = await request.json();
    const transition = TRANSITIONS[action];

    if (!transition) {
      return Response.json(
        { error: `Unknown action "${action}"` },
        { status: 400 },
      );
    }

    const supabase = await getSupabaseServerClient();

    const { data: existing, error: readError } = await supabase
      .from("rides")
      .select("ride_id, status")
      .eq("ride_id", id)
      .maybeSingle();

    if (readError) throw readError;
    if (!existing) {
      return Response.json({ error: "Ride not found" }, { status: 404 });
    }

    const current = existing.status ?? "booked";

    if (!transition.from.includes(current)) {
      return Response.json(
        {
          error: `Can't ${action} a ride that is "${current}"`,
          status: current,
        },
        { status: 409 },
      );
    }

    const payload: Record<string, unknown> = { status: transition.to };

    if (transition.to === "completed") {
      payload.completed_at = new Date().toISOString();
    }
    if (transition.to === "cancelled") {
      payload.cancelled_at = new Date().toISOString();
      if (reason) payload.cancel_reason = reason;
    }

    const { data, error } = await supabase
      .from("rides")
      .update(payload)
      .eq("ride_id", id)
      .select()
      .single();

    if (error) throw error;

    return Response.json({ data });
  } catch (error) {
    console.error("Error updating ride:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}