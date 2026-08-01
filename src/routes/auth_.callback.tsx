import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeNext } from "@/lib/oauth";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/auth_/callback")({
  // Session lives in localStorage; nothing to render on the server.
  ssr: false,
  component: AuthCallback,
  head: () => ({
    meta: [
      { title: "Signing you in — SurakshaSetu AI" },
      { name: "description", content: "Completing your secure sign-in to SurakshaSetu AI." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const url = new URL(window.location.href);
      const errDesc = url.searchParams.get("error_description") ?? url.searchParams.get("error");
      if (errDesc) {
        setError(errDesc);
        return;
      }

      // PKCE flow returns ?code=...; implicit flow returns tokens in the hash
      // (handled automatically by detectSessionInUrl).
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr && !/code verifier|both auth code/i.test(exErr.message)) {
          if (!cancelled) setError(exErr.message);
          return;
        }
      }

      // Poll briefly: detectSessionInUrl may still be persisting the session.
      for (let i = 0; i < 25; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          let next = "/dashboard";
          try {
            next = sanitizeNext(sessionStorage.getItem("post_auth_redirect"));
            sessionStorage.removeItem("post_auth_redirect");
          } catch {
            /* ignore */
          }
          if (!cancelled) navigate({ to: next, replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!cancelled) setError("We couldn't complete the sign-in. Please try again.");
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      {error ? (
        <>
          <p className="text-sm text-alert-red max-w-sm">{error}</p>
          <a
            href="/auth"
            className="rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Back to sign in
          </a>
        </>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Completing secure sign-in…
        </p>
      )}
    </div>
  );
}
