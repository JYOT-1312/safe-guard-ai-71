import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, MessageCircle, ScanLine, Mic, MessagesSquare, Mail, Link2, QrCode, BookOpen, GraduationCap, History, PhoneCall, LogOut, Menu, X, User, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useHasRole } from "@/hooks/use-role";
import { useI18n, type TKey } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

const baseNav = [
  { to: "/dashboard", label: "app.nav.dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "app.nav.chat", icon: MessageCircle },
  { to: "/scam-detector", label: "app.nav.scam", icon: ScanLine },
  { to: "/voice-detector", label: "app.nav.voice", icon: Mic },
  { to: "/chat-analyzer", label: "app.nav.chatAnalyzer", icon: MessagesSquare },
  { to: "/email-analyzer", label: "app.nav.email", icon: Mail },
  { to: "/url-analyzer", label: "app.nav.url", icon: Link2 },
  { to: "/qr-analyzer", label: "app.nav.qr", icon: QrCode },
  { to: "/knowledge", label: "app.nav.knowledge", icon: BookOpen },
  { to: "/learn", label: "app.nav.learn", icon: GraduationCap },
  { to: "/history", label: "app.nav.history", icon: History },
  { to: "/helpline", label: "app.nav.helpline", icon: PhoneCall },
  { to: "/profile", label: "app.nav.profile", icon: User },
] as const;

type NavItem = { to: string; label: TKey; icon: typeof LayoutDashboard };

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { has: isAdmin } = useHasRole("admin");
  const { t } = useI18n();
  const nav: NavItem[] = isAdmin
    ? [...baseNav, { to: "/admin", label: "app.nav.admin" as TKey, icon: ShieldCheck }]
    : [...baseNav];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-white sticky top-0 h-screen">
        <div className="p-6 border-b border-border"><Logo /></div>
        <nav className="flex-1 p-4 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "bg-brand-accent/10 text-brand-accent" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <n.icon className="size-4" /> {t(n.label)}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
            <LogOut className="size-4" /> {t("app.signout")}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col animate-slide-in-right">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)}><X className="size-5" /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary">
                  <n.icon className="size-4" /> {t(n.label)}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-border">
              <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary">
                <LogOut className="size-4" /> {t("app.signout")}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border">
          <div className="px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="size-5" /></button>
              <h1 className="text-lg font-semibold truncate">{title}</h1>
            </div>
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
