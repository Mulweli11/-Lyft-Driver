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
const supabaseServiceRoleKey = resolveEnv(
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SUPABASE_SECRET_KEY",
  "EXPO_PUBLIC_SUPABASE_SECRET_KEY",
);
const supabaseAnonKey = resolveEnv(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
);

export async function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Server Supabase credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
    );
  }

  const options: Record<string, unknown> = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };

  try {
    const wsModule = await import("ws");
    const ws = (wsModule.WebSocket ?? wsModule.default ?? wsModule) as unknown as typeof WebSocket;
    options.realtime = {
      transport: ws,
    };
  } catch (error) {
    console.warn("Unable to initialize Supabase server realtime transport:", error);
  }

  return createSupabaseClient(
    supabaseUrl,
    supabaseServiceRoleKey,
    options as never,
  );
}
