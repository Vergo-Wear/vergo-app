import { createClient, Session, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseTableName = process.env.NEXT_PUBLIC_SUPABASE_TABLE || "products";

let cachedClient: SupabaseClient | null = null;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return cachedClient;
}

export async function getSupabaseRedirectSession(
  client: SupabaseClient,
): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  let session: Session | null = null;
  if (code) {
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    session = data.session;
    url.searchParams.delete("code");
  } else if (accessToken && refreshToken) {
    const { data, error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    session = data.session;
    url.hash = "";
  } else {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    session = data.session;
  }

  if (code || accessToken) {
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return session;
}
