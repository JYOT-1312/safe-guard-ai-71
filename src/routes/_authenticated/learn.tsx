import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ShieldCheck, CreditCard, Smartphone, Wifi, Building, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/learn")({
  component: Learn,
});

const lessons = [
  { icon: Smartphone, title: "UPI Safety", color: "bg-brand-accent", points: [
    "Nobody who sends you money needs your UPI PIN. Ever.",
    "A 'Request Money' notification is a payment REQUEST from someone else — not a refund.",
    "Verify the merchant name before confirming any payment.",
  ]},
  { icon: CreditCard, title: "ATM & Debit Card", color: "bg-safety-green", points: [
    "Cover the keypad while entering your PIN — even if nobody is around.",
    "Never share OTPs, CVV, or PIN over phone or SMS.",
    "Report a lost card immediately to your bank's helpline.",
  ]},
  { icon: Building, title: "Fake Loan Apps", color: "bg-alert-amber", points: [
    "Only use loan apps from RBI-registered NBFCs or banks. Check the RBI list.",
    "Never grant access to Contacts, Photos, or SMS to a lending app.",
    "Fast approval + no paperwork + zero credit check = predatory. Walk away.",
  ]},
  { icon: Wifi, title: "Phishing & Fake Links", color: "bg-alert-red", points: [
    "Banks never send you links to 'update KYC' via SMS or WhatsApp.",
    "Check URLs carefully: icici.com is real, icici-bank.online is fake.",
    "When in doubt, open the bank app directly — never through a message link.",
  ]},
  { icon: ShieldCheck, title: "Cyber Hygiene", color: "bg-brand-primary", points: [
    "Use a unique password for banking. Never share it.",
    "Turn on 2-factor authentication wherever available.",
    "Update your phone OS and apps regularly.",
  ]},
  { icon: AlertTriangle, title: "If You've Been Scammed", color: "bg-alert-red", points: [
    "Call 1930 within 24 hours to maximize recovery chances.",
    "Report at cybercrime.gov.in with all screenshots and transaction IDs.",
    "Freeze your bank account and cards through the bank app or helpline.",
  ]},
];

function Learn() {
  return (
    <AppShell title="Learning Center">
      <div className="p-6 lg:p-10 max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Learn to spot scams like a pro</h2>
          <p className="text-muted-foreground mt-1">The rules below cover 90% of digital banking fraud in India.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {lessons.map((l) => (
            <div key={l.title} className="p-6 bg-white border border-border rounded-3xl">
              <div className={`size-12 rounded-2xl ${l.color} text-white grid place-items-center mb-4`}>
                <l.icon className="size-6" />
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
            </div>
          ))}
        </div>

        <div className="mt-10 p-6 rounded-3xl bg-brand-primary text-white">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-accent mb-2">Golden Rule</div>
          <p className="text-lg">If someone is <span className="font-bold">rushing you</span> to pay, share an OTP, or download an app — it's <span className="text-alert-red font-bold">almost always a scam</span>. Slow down. Verify. Ask SurakshaSetu AI.</p>
        </div>
      </div>
    </AppShell>
  );
}
