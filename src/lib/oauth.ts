import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

/**
 * The Lovable OAuth broker is served by the Lovable proxy at the same-origin
 * paths `/~oauth/initiate` and `/~oauth/callback`. Those paths only exist on
 * Lovable-hosted domains (*.lovable.app / *.lovable.dev / custom domains
 * attached in Lovable). On any other host — e.g. Vercel — the browser hits a
 * path the app never defines, which is exactly the post-Google 404.
 *
 * So: use the broker where it exists, and Supabase's own OAuth endpoint
 * (which redirects back to our real `/auth/callback` route) everywhere else.
 */
export function isLovableHost(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return (
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovable.dev") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

/** Only same-origin relative paths are accepted as a post-login destination. */
export function sanitizeNext(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

export async function signInWithGoogle(next = "/dashboard"): Promise<{ error?: Error; redirected?: boolean }> {
  const origin = window.location.origin;
  try {
    sessionStorage.setItem("post_auth_redirect", sanitizeNext(next));
  } catch {
    /* storage unavailable — fall back to /dashboard */
  }

  if (isLovableHost()) {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: origin });
    return result as { error?: Error; redirected?: boolean };
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
