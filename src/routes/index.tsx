import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, Mic, QrCode, MessageCircle, Building2, Phone, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-shield.jpg";
import howImage from "@/assets/how-it-works.jpg";
import { Logo } from "@/components/logo";
import { LESSON_TOPICS } from "@/lib/lesson-videos";
import { LessonVideoCard } from "@/components/lesson-video-card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Landing,
});

const capabilities: { icon: typeof ScanLine; title: TKey; desc: TKey }[] = [
  { icon: ScanLine, title: "cap.scam.title", desc: "cap.scam.desc" },
  { icon: Building2, title: "cap.upi.title", desc: "cap.upi.desc" },
  { icon: Mic, title: "cap.voice.title", desc: "cap.voice.desc" },
  { icon: QrCode, title: "cap.qr.title", desc: "cap.qr.desc" },
  { icon: Phone, title: "cap.loan.title", desc: "cap.loan.desc" },
  { icon: MessageCircle, title: "cap.chat.title", desc: "cap.chat.desc" },
];

function Landing() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "var(--font-multilingual)" }}>
      {/* Multilingual bar */}
      <div className="bg-brand-primary text-white py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs">
          <LanguageSwitcher tone="dark" />
          <div className="hidden md:block opacity-60">{t("top.helpline")}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">{t("nav.features")}</a>
            <a href="#how" className="hover:text-foreground transition-colors">{t("nav.how")}</a>
            <a href="#learn" className="hover:text-foreground transition-colors">{t("nav.safety")}</a>
            <Link to="/auth" className="text-foreground hover:text-brand-accent">{t("nav.login")}</Link>
            <Link to="/auth" className="px-5 py-2.5 bg-brand-primary text-white rounded-full text-sm font-semibold hover:bg-brand-primary/90 transition-colors">{t("nav.tryFree")}</Link>
          </div>
          <Link to="/auth" className="md:hidden px-4 py-2 bg-brand-primary text-white rounded-full text-sm font-semibold">{t("nav.tryFreeShort")}</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 pb-24 md:pt-20 md:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/10 text-brand-accent text-xs font-bold uppercase tracking-wider mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
              </span>
              {t("hero.badge")}
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.15] mb-8 tracking-tight">
              {t("hero.title.a")} <span className="text-brand-accent italic">{t("hero.title.shield")}</span> {t("hero.title.b")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              {t("hero.sub")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth" className="px-8 py-4 bg-brand-accent text-white rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform shadow-lg shadow-brand-accent/20 inline-flex items-center justify-center gap-2">
                {t("hero.cta1")} <ArrowRight className="size-5" />
              </Link>
              <Link to="/auth" className="px-8 py-4 bg-white border border-border text-foreground rounded-2xl font-bold text-lg hover:bg-secondary transition-colors inline-flex items-center justify-center gap-2">
                <MessageCircle className="size-5" /> {t("hero.cta2")}
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t("hero.note")}</p>
          </div>
          <div className="relative">
            <img
              src={heroImage}
              alt="SurakshaSetu AI detecting a fraudulent UPI payment request with a 94% risk score"
              width={1024}
              height={1280}
              className="w-full aspect-[4/5] object-cover rounded-[40px] shadow-2xl border border-border"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-4 md:p-6 rounded-3xl shadow-xl border border-border flex items-center gap-4 max-w-xs">
              <div className="size-12 bg-safety-green/10 rounded-full flex items-center justify-center text-safety-green shrink-0">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold">{t("hero.verified")}</div>
                <div className="text-xs text-muted-foreground truncate">{t("hero.merchant")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="bg-white py-16 md:py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 gap-8 lg:gap-12">
            {([
              { v: "99.8%", l: "stats.accuracy" as TKey },
              { v: "24/7", l: "stats.monitoring" as TKey },
            ]).map((s) => (
              <div key={s.l}>
                <div className="text-4xl md:text-5xl font-bold mb-1 tracking-tight">{s.v}</div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">{t(s.l)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-accent mb-4">
              <Sparkles className="size-3.5" /> {t("caps.kicker")}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">{t("caps.title")}</h2>
            <p className="text-muted-foreground text-lg">{t("caps.sub")}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c) => (
              <div key={c.title} className="p-8 bg-white border border-border rounded-3xl hover:border-brand-accent hover:shadow-lg hover:shadow-brand-accent/5 transition-all group">
                <div className="size-14 bg-secondary rounded-2xl mb-6 flex items-center justify-center group-hover:bg-brand-accent/10 transition-colors">
                  <c.icon className="size-6 text-muted-foreground group-hover:text-brand-accent transition-colors" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold mb-3">{t(c.title)}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{t(c.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="bg-brand-primary text-white py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold mb-12 tracking-tight">{t("how.title")}</h2>
              <div className="space-y-10">
                {([
                  ["01", "how.1.t", "how.1.d"],
                  ["02", "how.2.t", "how.2.d"],
                  ["03", "how.3.t", "how.3.d"],
                ] as [string, TKey, TKey][]).map(([n, tk, dk]) => (
                  <div key={n} className="flex gap-6">
                    <div className="text-brand-accent text-3xl font-bold shrink-0">{n}</div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{t(tk)}</h4>
                      <p className="text-slate-400">{t(dk)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <img src={howImage} alt="Holographic shield scanning a suspicious link" width={1024} height={1024} loading="lazy" className="aspect-square rounded-[60px] w-full object-cover border border-white/10" />
          </div>
        </div>
      </section>

      {/* Learning Center Teaser */}
      <section id="learn" className="py-24 md:py-32 px-6 bg-white border-y border-border">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_auto] items-end gap-8 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">{t("learn.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl">{t("learn.sub")}</p>
          </div>
          <Link to="/learn" className="text-brand-accent font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all">{t("learn.browse")} <ArrowRight className="size-4" /></Link>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {LESSON_TOPICS.map((topic) => (
            <LessonVideoCard key={topic.slug} topic={topic} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">{t("cta.title")}</h2>
          <p className="text-muted-foreground text-lg mb-8">{t("cta.sub")}</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-colors">
            {t("cta.button")} <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary pt-24 pb-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <Logo />
              <p className="text-muted-foreground max-w-sm mt-6">{t("footer.tagline")}</p>
              <div className="mt-6"><LanguageSwitcher /></div>
            </div>
            <div>
              <h5 className="font-bold mb-6">{t("footer.resources")}</h5>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#learn" className="hover:text-brand-accent">{t("nav.safety")}</a></li>
                <li><a href="https://www.cybercrime.gov.in" target="_blank" rel="noreferrer" className="hover:text-brand-accent">{t("footer.portal")}</a></li>
                <li><a href="https://www.cybercrime.gov.in/Webform/Accept.aspx" target="_blank" rel="noreferrer" className="hover:text-brand-accent">{t("footer.report")}</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6">{t("footer.company")}</h5>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-brand-accent">{t("footer.about")}</a></li>
                <li><a href="#" className="hover:text-brand-accent">{t("footer.privacy")}</a></li>
                <li><a href="#" className="hover:text-brand-accent">{t("footer.terms")}</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border gap-2">
            <p className="text-xs text-muted-foreground">{t("footer.copy")}</p>
            <p className="text-xs text-muted-foreground italic">{t("footer.slogan")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
