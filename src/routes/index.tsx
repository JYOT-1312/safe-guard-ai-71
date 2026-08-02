import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ScanLine, Mic, QrCode, MessageCircle, Building2, Phone, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-shield.jpg";
import howImage from "@/assets/how-it-works.jpg";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/")({
  component: Landing,
});

const capabilities = [
  { icon: ScanLine, title: "Scam Detector", desc: "Upload any suspicious SMS, WhatsApp or email screenshot. AI reads the text and flags fraud instantly." },
  { icon: Building2, title: "UPI Checker", desc: "Verify UPI IDs and payment requests before you pay. Catches 'collect' scams disguised as refunds." },
  { icon: Mic, title: "Voice Scam Shield", desc: "Analyze fake 'bank manager' or 'KYC' calls in Hindi, Tamil and 5 more languages." },
  { icon: QrCode, title: "QR Analyzer", desc: "Decode any QR code before scanning. See who you're paying and why." },
  { icon: Phone, title: "Loan App Checker", desc: "Confirm if a loan app is RBI-registered — or a predatory trap that will harass you." },
  { icon: MessageCircle, title: "AI Chat Companion", desc: "Ask any question in your language. Get calm, clear guidance on what to do next." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Multilingual bar */}
      <div className="bg-brand-primary text-white py-2 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs" style={{ fontFamily: "var(--font-multilingual)" }}>
          <div className="flex gap-4 opacity-80 flex-wrap">
            <span>English</span><span>हिंदी</span><span>ગુજરાતી</span><span>मराठी</span><span>தமிழ்</span><span>ਪੰਜਾਬੀ</span><span>বাংলা</span>
          </div>
          <div className="hidden md:block opacity-60">24/7 Cyber Fraud Helpline: 1930</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it Works</a>
            <a href="#learn" className="hover:text-foreground transition-colors">Safety Center</a>
            <Link to="/auth" className="text-foreground hover:text-brand-accent">Login</Link>
            <Link to="/auth" className="px-5 py-2.5 bg-brand-primary text-white rounded-full text-sm font-semibold hover:bg-brand-primary/90 transition-colors">Try AI Free</Link>
          </div>
          <Link to="/auth" className="md:hidden px-4 py-2 bg-brand-primary text-white rounded-full text-sm font-semibold">Try Free</Link>
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
              AI Protection Active in 7 Languages
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-8 tracking-tight">
              Your Digital <span className="text-brand-accent italic">Shield</span> for Banking.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              Detect UPI scams, verify suspicious loan apps, and block phishing links before they steal your money. Simple safety for first-time digital users.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth" className="px-8 py-4 bg-brand-accent text-white rounded-2xl font-bold text-lg hover:scale-[1.02] transition-transform shadow-lg shadow-brand-accent/20 inline-flex items-center justify-center gap-2">
                Scan Screenshot Now <ArrowRight className="size-5" />
              </Link>
              <Link to="/auth" className="px-8 py-4 bg-white border border-border text-foreground rounded-2xl font-bold text-lg hover:bg-secondary transition-colors inline-flex items-center justify-center gap-2">
                <MessageCircle className="size-5" /> Try AI Chat
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Free forever. No credit card. No app install.</p>
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
                <div className="text-sm font-bold">UPI ID Verified</div>
                <div className="text-xs text-muted-foreground truncate">Merchant: amazon@icici</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="bg-white py-16 md:py-20 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 gap-8 lg:gap-12">
            {[
              { v: "99.8%", l: "AI Accuracy" },
              { v: "24/7", l: "Real-time Monitoring" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-4xl md:text-5xl font-bold mb-1 tracking-tight">{s.v}</div>
                <div className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wider">{s.l}</div>
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
              <Sparkles className="size-3.5" /> Complete Toolkit
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Complete Fraud Protection</h2>
            <p className="text-muted-foreground text-lg">One companion to protect your entire digital financial life.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c) => (
              <div key={c.title} className="p-8 bg-white border border-border rounded-3xl hover:border-brand-accent hover:shadow-lg hover:shadow-brand-accent/5 transition-all group">
                <div className="size-14 bg-secondary rounded-2xl mb-6 flex items-center justify-center group-hover:bg-brand-accent/10 transition-colors">
                  <c.icon className="size-6 text-muted-foreground group-hover:text-brand-accent transition-colors" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold mb-3">{c.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{c.desc}</p>
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
              <h2 className="text-3xl md:text-5xl font-bold mb-12 tracking-tight">Protect yourself in 3 steps</h2>
              <div className="space-y-10">
                {[
                  ["01", "Take a Screenshot", "Capture any suspicious SMS, WhatsApp message, or payment request screen."],
                  ["02", "AI Analysis", "Our multilingual AI scans the content, URLs, and sender reputation instantly."],
                  ["03", "Safe or Scam", "Get a clear green or red signal with easy-to-follow steps to stay safe."],
                ].map(([n, t, d]) => (
                  <div key={n} className="flex gap-6">
                    <div className="text-brand-accent text-3xl font-bold shrink-0">{n}</div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">{t}</h4>
                      <p className="text-slate-400">{d}</p>
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">Learn to spot scams like a pro</h2>
            <p className="text-muted-foreground text-lg max-w-xl">Bite-sized lessons on UPI, ATM, credit cards, and cyber security — in your language.</p>
          </div>
          <Link to="/learn" className="text-brand-accent font-semibold inline-flex items-center gap-2 hover:gap-3 transition-all">Browse Safety Center <ArrowRight className="size-4" /></Link>
        </div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-4">
          {["UPI Safety", "ATM & Debit", "Net Banking", "Cyber Hygiene"].map((t) => (
            <div key={t} className="p-6 rounded-2xl border border-border bg-background hover:border-brand-accent transition-colors">
              <ShieldCheck className="size-6 text-brand-accent mb-4" />
              <div className="font-semibold">{t}</div>
              <div className="text-xs text-muted-foreground mt-1">6 lessons · 12 min</div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Stay safe, every time you pay.</h2>
          <p className="text-muted-foreground text-lg mb-8">Join hundreds of thousands of Indians protecting their money with SurakshaSetu AI.</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-4 bg-brand-primary text-white rounded-2xl font-bold text-lg hover:bg-brand-primary/90 transition-colors">
            Create Free Account <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary pt-24 pb-12 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <Logo />
              <p className="text-muted-foreground max-w-sm mt-6">Making digital banking safe for the next billion users in India. Trained on local fraud patterns.</p>
            </div>
            <div>
              <h5 className="font-bold mb-6">Resources</h5>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#learn" className="hover:text-brand-accent">Safety Center</a></li>
                <li><a href="https://www.cybercrime.gov.in" target="_blank" rel="noreferrer" className="hover:text-brand-accent">Cyber Crime Portal</a></li>
                <li><a href="#" className="hover:text-brand-accent">Report a Scam</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-6">Company</h5>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-brand-accent">About</a></li>
                <li><a href="#" className="hover:text-brand-accent">Privacy</a></li>
                <li><a href="#" className="hover:text-brand-accent">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border gap-2">
            <p className="text-xs text-muted-foreground">© 2026 SurakshaSetu AI. A Bharat-first safety initiative.</p>
            <p className="text-xs text-muted-foreground italic" style={{ fontFamily: "var(--font-multilingual)" }}>सुरक्षित रहिए, सतर्क रहिए।</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
