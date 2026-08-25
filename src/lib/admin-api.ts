import { supabase } from "@/integrations/supabase/client";

/**
 * Robustly retrieves admin authentication headers for API calls.
 * Checks active session, Supabase auth user, and local auth storage.
 */
export async function getAdminAuthHeaders(
  additionalHeaders: Record<string, string> = {},
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  let token: string | undefined;

  // 1. Try supabase.auth.getSession()
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      token = data.session.access_token;
    }
  } catch (err) {
    console.warn("[AdminAPI] getSession error:", err);
  }

  // 2. Fallback: try supabase.auth.getUser() if token still empty
  if (!token) {
    try {
      const { data } = await supabase.auth.getUser();
      // If user exists, try to get current session again
      if (data.user) {
        const { data: sData } = await supabase.auth.getSession();
        token = sData.session?.access_token;
      }
    } catch (err) {
      console.warn("[AdminAPI] getUser error:", err);
    }
  }

  // 3. Fallback: inspect localStorage for Supabase access token
  if (!token && typeof window !== "undefined" && window.localStorage) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith("sb-") || key.includes("supabase")) &&
          key.endsWith("-auth-token")
        ) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const found =
              parsed?.access_token ||
              parsed?.currentSession?.access_token ||
              parsed?.session?.access_token;
            if (typeof found === "string" && found.length > 20) {
              token = found;
              break;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}
