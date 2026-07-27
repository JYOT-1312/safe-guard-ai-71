import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ShieldCheck, CreditCard, Smartphone, Wifi, Building, AlertTriangle, Trophy } from "lucide-react";
import { QUIZZES } from "@/lib/quizzes";
import { QuizCard } from "@/components/quiz-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/learn")({
  component: Learn,
});

const lessons = [
  { slug: "upi-safety", icon: Smartphone, title: "UPI Safety", color: "bg-brand-accent", points: [
    "Nobody who sends you money needs your UPI PIN. Ever.",
    "A 'Request Money' notification is a payment REQUEST from someone else — not a refund.",
    "Verify the merchant name before confirming any payment.",
  ]},
  { slug: "atm-card", icon: CreditCard, title: "ATM & Debit Card", color: "bg-safety-green", points: [
    "Cover the keypad while entering your PIN — even if nobody is around.",
    "Never share OTPs, CVV, or PIN over phone or SMS.",
    "Report a lost card immediately to your bank's helpline.",
  ]},
  { slug: "fake-loan", icon: Building, title: "Fake Loan Apps", color: "bg-alert-amber", points: [
    "Only use loan apps from RBI-registered NBFCs or banks. Check the RBI list.",
    "Never grant access to Contacts, Photos, or SMS to a lending app.",
    "Fast approval + no paperwork + zero credit check = predatory. Walk away.",
  ]},
  { slug: "phishing", icon: Wifi, title: "Phishing & Fake Links", color: "bg-alert-red", points: [
    "Banks never send you links to 'update KYC' via SMS or WhatsApp.",
    "Check URLs carefully: icici.com is real, icici-bank.online is fake.",
    "When in doubt, open the bank app directly — never through a message link.",
  ]},
  { slug: "cyber-hygiene", icon: ShieldCheck, title: "Cyber Hygiene", color: "bg-brand-primary", points: [
    "Use a unique password for banking. Never share it.",
    "Turn on 2-factor authentication wherever available.",
    "Update your phone OS and apps regularly.",
  ]},
  { slug: "after-scam", icon: AlertTriangle, title: "If You've Been Scammed", color: "bg-alert-red", points: [
    "Call 1930 within 24 hours to maximize recovery chances.",
    "Report at cybercrime.gov.in with all screenshots and transaction IDs.",
    "Freeze your bank account and cards through the bank app or helpline.",
  ]},
] as const;

function Learn() {
  const { data: attempts } = useQuery({
    queryKey: ["quiz-attempts"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as { module_slug: string; score: number; total: number }[];
      const { data, error } = await supabase.from("quiz_attempts")
        .select("module_slug, score, total").eq("user_id", u.user.id);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const bestByModule = new Map<string, { score: number; total: number }>();
  for (const a of attempts ?? []) {
    const prev = bestByModule.get(a.module_slug);
    const pct = a.score / a.total;
    if (!prev || pct > prev.score / prev.total) bestByModule.set(a.module_slug, a);
  }
  const totalBest = Array.from(bestByModule.values()).reduce((sum, b) => sum + b.score, 0);
  const totalMax = lessons.reduce((sum, l) => sum + (QUIZZES[l.slug]?.questions.length ?? 0), 0);

  return (
    <AppShell title="Learning Center">
      <div className="p-6 lg:p-10 max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Learn to spot scams like a pro</h2>
            <p className="text-muted-foreground mt-1">Read the rules, then test yourself — 90% of digital banking fraud in India follows these patterns.</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand-accent/10 text-brand-accent border border-brand-accent/30">
            <Trophy className="size-5" />
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">Your score</div>
              <div className="text-lg font-bold leading-tight">{totalBest} / {totalMax}</div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {lessons.map((l) => {
            const best = bestByModule.get(l.slug);
            const quiz = QUIZZES[l.slug];
            return (
              <div key={l.slug} className="p-6 bg-white border border-border rounded-3xl">
                <div className="flex items-start justify-between gap-3">
                  <div className={`size-12 rounded-2xl ${l.color} text-white grid place-items-center mb-4`}>
                    <l.icon className="size-6" />
                  </div>
                  {best && (
                    <div className="text-xs font-bold uppercase tracking-wider text-safety-green inline-flex items-center gap-1">
                      <Trophy className="size-3" /> {best.score}/{best.total}
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-4">{l.title}</h3>
                <ul className="space-y-3">
                  {l.points.map((p) => (
                    <li key={p} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-brand-accent font-bold shrink-0">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                {quiz && <QuizCard module={quiz} />}
              </div>
            );
          })}
        </div>

        <div className="mt-10 p-6 rounded-3xl bg-brand-primary text-white">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-accent mb-2">Golden Rule</div>
          <p className="text-lg">If someone is <span className="font-bold">rushing you</span> to pay, share an OTP, or download an app — it's <span className="text-alert-red font-bold">almost always a scam</span>. Slow down. Verify. Ask SurakshaSetu AI.</p>
        </div>
      </div>
    </AppShell>
  );
}
