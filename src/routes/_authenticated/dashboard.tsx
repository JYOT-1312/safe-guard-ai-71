import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MessageCircle, ScanLine, GraduationCap, ShieldCheck, ArrowRight, AlertTriangle, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const user = Route.useRouteContext().user;
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "there";

  return (
    <AppShell title="Dashboard">
      <div className="p-6 lg:p-10 space-y-8 max-w-6xl">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Hi {name} 👋</h2>
          <p className="text-muted-foreground mt-1">Your AI shield is active. What would you like to check today?</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Action to="/scam-detector" icon={ScanLine} title="Scan a message" desc="Upload a screenshot or paste text. AI tells you if it's a scam in seconds." primary />
          <Action to="/chat" icon={MessageCircle} title="Ask AI Companion" desc="Chat in your language about any banking safety concern." />
          <Action to="/learn" icon={GraduationCap} title="Learn Safety" desc="Bite-sized lessons on UPI, ATM, phishing and more." />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-white border border-border">
            <div className="flex items-center gap-2 text-safety-green mb-3">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Protection Status</span>
            </div>
            <div className="text-3xl font-bold">All systems active</div>
            <p className="text-sm text-muted-foreground mt-2">Multilingual scam detection, UPI verification and phishing analysis are ready.</p>
          </div>
          <div className="p-6 rounded-3xl bg-brand-primary text-white">
            <div className="flex items-center gap-2 text-alert-red mb-3">
              <AlertTriangle className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Emergency</span>
            </div>
            <div className="text-lg font-bold">Lost money to a scam?</div>
            <p className="text-sm text-slate-300 mt-2">Report within 24 hours to increase chances of recovery.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="tel:1930" className="inline-flex items-center gap-2 px-4 py-2 bg-alert-red text-white rounded-full text-sm font-semibold"><Phone className="size-4" /> Call 1930</a>
              <a href="https://www.cybercrime.gov.in" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full text-sm font-semibold">cybercrime.gov.in</a>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Action({ to, icon: Icon, title, desc, primary }: { to: "/scam-detector" | "/chat" | "/learn"; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; primary?: boolean }) {
  return (
    <Link to={to} className={`group p-6 rounded-3xl border transition-all ${primary ? "bg-brand-primary text-white border-brand-primary hover:bg-brand-primary/90" : "bg-white border-border hover:border-brand-accent hover:shadow-lg hover:shadow-brand-accent/5"}`}>
      <div className={`size-12 rounded-2xl flex items-center justify-center mb-4 ${primary ? "bg-white/10" : "bg-secondary group-hover:bg-brand-accent/10"}`}>
        <Icon className={`size-6 ${primary ? "text-white" : "text-brand-accent"}`} />
      </div>
      <div className="font-bold text-lg mb-1">{title}</div>
      <p className={`text-sm ${primary ? "text-slate-300" : "text-muted-foreground"}`}>{desc}</p>
      <div className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${primary ? "text-white" : "text-brand-accent"}`}>
        Open <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
