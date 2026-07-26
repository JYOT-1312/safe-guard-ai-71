import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
  head: () => ({
    meta: [
      { title: "Reset your password · SurakshaSetu AI" },
      { name: "description", content: "Send yourself a secure link to reset your SurakshaSetu password." },
    ],
  }),
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent — check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-background">
      <div className="max-w-md w-full">
        <div className="mb-8"><Logo /></div>
        <h1 className="text-3xl font-bold mb-2">Forgot your password?</h1>
        <p className="text-muted-foreground mb-8">
          Enter your email and we'll send you a secure link to set a new one.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-safety-green/40 bg-safety-green/5 p-6 text-sm">
            <ShieldCheck className="size-6 text-safety-green mb-2" />
            If an account exists for <b>{email}</b>, a reset link is on its way.
            The link is valid for 60 minutes.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium mb-1.5 block">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            </label>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-accent text-white rounded-xl font-semibold disabled:opacity-50">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <>Send reset link <ArrowRight className="size-4" /></>}
            </button>
          </form>
        )}

        <Link to="/auth" className="block text-center text-sm text-muted-foreground mt-8 hover:text-foreground">
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
