import { supabase } from "@/integrations/supabase/client";

/** Only same-origin relative paths are accepted as a post-login destination. */
export function sanitizeNext(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

/**
 * Native Supabase Google OAuth. Always returns the browser to the app's own
 * `/auth/callback` route, which exchanges the code and restores the session.
 */
export async function signInWithGoogle(
  next = "/dashboard",
): Promise<{ error?: Error; redirected?: boolean }> {
  const origin = window.location.origin;
  try {
    sessionStorage.setItem("post_auth_redirect", sanitizeNext(next));
  } catch {
    /* storage unavailable — fall back to /dashboard */
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) return { error };
  // supabase-js navigates the browser to Google.
  return { redirected: true };
}
