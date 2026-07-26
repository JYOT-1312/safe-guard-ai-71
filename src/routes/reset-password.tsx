import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: "Set a new password · SurakshaSetu AI" },
      { name: "description", content: "Choose a strong new password for your SurakshaSetu account." },
    ],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash on load and fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Signing you in…");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="max-w-md w-full">
        <div className="mb-8"><Logo /></div>
        <h1 className="text-3xl font-bold mb-2">Set a new password</h1>
        <p className="text-muted-foreground mb-8">
          Choose a strong password you don't use anywhere else.
        </p>

        {!ready ? (
          <div className="rounded-2xl border border-border p-6 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin mb-2 text-brand-accent" />
            Verifying your reset link… If nothing happens, request a new{" "}
            <Link to="/forgot-password" className="text-brand-accent underline">reset link</Link>.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {[
              ["New password", password, setPassword] as const,
              ["Confirm new password", confirm, setConfirm] as const,
            ].map(([label, val, set]) => (
              <label key={label} className="block">
                <span className="text-sm font-medium mb-1.5 block">{label}</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="password" value={val} onChange={(e) => set(e.target.value)}
                    required minLength={8} placeholder="At least 8 characters"
                    className="w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              </label>
            ))}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-accent text-white rounded-xl font-semibold disabled:opacity-50">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <>Update password <ArrowRight className="size-4" /></>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
