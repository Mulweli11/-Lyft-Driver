import { startVerification } from "@didit-protocol/sdk-react-native";
import { fetchAPI } from "@/lib/fetch";

export type DiditStartResult = {
  session_id: string;
  session_token: string;
  url: string;
};

export async function startDiditVerification(
  clerkId: string,
): Promise<DiditStartResult> {
  const res = await fetchAPI("/(api)/didit-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clerkId }),
  });

  const session: DiditStartResult | undefined = res?.data ?? res;

  if (!session?.session_token) {
    throw new Error("We couldn't start the identity check. Please try again.");
  }

  try {
    await startVerification(session.session_token);
  } catch (err) {
    console.warn("Native Didit SDK launch fallback to webview", err);
  }

  return session;
}