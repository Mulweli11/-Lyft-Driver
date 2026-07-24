import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const resolveEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name];
    if (value) {
      return value;
    }
  }

  return undefined;
};

const supabaseUrl = resolveEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_URL",
  "SUPABASE_URL",
);
const supabaseAnonKey = resolveEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
);

const shouldUseNodeTransport = () => {
  return typeof window === "undefined" && typeof process !== "undefined" && !!process.versions?.node;
};

const getNodeWsTransport = async () => {
  if (!shouldUseNodeTransport()) {
    return undefined;
  }

  try {
    const wsModule = await import("ws");
    return (wsModule.WebSocket ?? wsModule.default ?? wsModule) as unknown as typeof WebSocket;
  } catch (error) {
    console.warn("Unable to load WebSocket transport for Supabase realtime client:", error);
    return undefined;
  }
};

export async function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const options: Record<string, unknown> = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };

  const wsTransport = await getNodeWsTransport();
  if (wsTransport) {
    options.realtime = {
      transport: wsTransport,
    };
  }

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, options as never);
}
