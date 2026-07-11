import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { ShieldCheck, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message || "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-brand-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, rgb(37 99 235 / 0.4), transparent 50%), radial-gradient(circle at 80% 80%, rgb(16 185 129 / 0.3), transparent 50%)"
        }} />
        <div className="relative">
          <Logo />
        </div>
        <div className="relative space-y-8">
          <h2 className="text-4xl font-bold leading-tight">Your Digital Shield<br />for Banking.</h2>
          <div className="space-y-4">
            {[
              ["₹42Cr+", "in scams prevented"],
              ["500k+", "Indians protected"],
              ["7 languages", "including Hindi, Tamil, Bengali"],
            ].map(([n, t]) => (
              <div key={n} className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-brand-accent">{n}</span>
                <span className="text-sm text-slate-300">{t}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <ShieldCheck className="size-4 text-safety-green" />
            Bank-grade encryption. Data never sold.
          </div>
        </div>
        <p className="relative text-xs text-slate-400 italic" style={{ fontFamily: "var(--font-multilingual)" }}>
          सुरक्षित रहिए, सतर्क रहिए।
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="lg:hidden mb-8"><Logo /></div>
        <div className="max-w-md w-full mx-auto lg:mx-0">
          <h1 className="text-3xl font-bold mb-2">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {mode === "login" ? "Sign in to keep your money safe." : "Free forever. No credit card required."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-xl font-medium hover:bg-secondary transition-colors disabled:opacity-50 mb-3"
          >
            <svg className="size-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <Field icon={User} label="Full name" type="text" value={name} onChange={setName} placeholder="Aarav Sharma" required />
            )}
            <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
            <Field icon={Lock} label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" required minLength={mode === "signup" ? 8 : undefined} />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="size-4" /></>}
            </button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {mode === "login" ? "New to SurakshaSetu?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-brand-accent font-semibold hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>

          <Link to="/" className="block text-center text-xs text-muted-foreground mt-8 hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, type, value, onChange, placeholder, required, minLength }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; required?: boolean; minLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium mb-1.5 block">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} required={required} minLength={minLength}
          className="w-full pl-10 pr-3 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
        />
      </div>
    </label>
  );
}
