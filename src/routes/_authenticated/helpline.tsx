import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { Phone, Search, ShieldAlert, Landmark, Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/helpline")({
  component: HelplinePage,
  head: () => ({
    meta: [
      { title: "Bank & Cyber Fraud Helpline Numbers | SurakshaSetu AI" },
      {
        name: "description",
        content:
          "Call Indian bank customer-care and cyber fraud helplines instantly — 1930 cyber crime, RBI, and 24x7 numbers for every major Indian bank.",
      },
      { property: "og:title", content: "Bank & Cyber Fraud Helpline Numbers" },
      {
        property: "og:description",
        content: "One-tap calling for 1930 cyber fraud helpline and every major Indian bank's 24x7 support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Entry = { name: string; numbers: string[]; note?: string };

const EMERGENCY: Entry[] = [
  { name: "Cyber Crime Helpline (National)", numbers: ["1930"], note: "Report financial cyber fraud within the golden hour" },
  { name: "Police Emergency", numbers: ["112"] },
  { name: "RBI Sachet / Complaints", numbers: ["14440"], note: "RBI awareness & complaint helpline" },
  { name: "NPCI UPI Help", numbers: ["18001201740"], note: "UPI dispute assistance" },
  { name: "Women Helpline", numbers: ["1091"] },
];

const BANKS: Entry[] = [
  { name: "State Bank of India (SBI)", numbers: ["18001234", "18002100", "1800112211"] },
  { name: "HDFC Bank", numbers: ["18002026161", "18001600"] },
  { name: "ICICI Bank", numbers: ["18001080", "18601207777"] },
  { name: "Axis Bank", numbers: ["18604195555", "18001035577"] },
  { name: "Kotak Mahindra Bank", numbers: ["18602662666"] },
  { name: "Punjab National Bank (PNB)", numbers: ["18001800", "18002021"] },
  { name: "Bank of Baroda", numbers: ["18005700", "18001024455"] },
  { name: "Canara Bank", numbers: ["18001030", "18002083333"] },
  { name: "Union Bank of India", numbers: ["18002082244", "18004251515"] },
  { name: "Bank of India", numbers: ["18001031906", "1800220229"] },
  { name: "Indian Bank", numbers: ["18004250000", "18001004455"] },
  { name: "Indian Overseas Bank", numbers: ["18008904445", "18004254445"] },
  { name: "Central Bank of India", numbers: ["18001102001"] },
  { name: "UCO Bank", numbers: ["18001030123"] },
  { name: "Bank of Maharashtra", numbers: ["18002334526"] },
  { name: "Punjab & Sind Bank", numbers: ["18004198300"] },
  { name: "IDBI Bank", numbers: ["18002094324", "18002091947"] },
  { name: "IndusInd Bank", numbers: ["18602677777"] },
  { name: "Yes Bank", numbers: ["18001200"] },
  { name: "IDFC FIRST Bank", numbers: ["18004194332"] },
  { name: "Federal Bank", numbers: ["18004201199", "18604250000"] },
  { name: "South Indian Bank", numbers: ["18004251809"] },
  { name: "Karnataka Bank", numbers: ["18004251444"] },
  { name: "Karur Vysya Bank", numbers: ["18001028484"] },
  { name: "City Union Bank", numbers: ["18002587200"] },
  { name: "RBL Bank", numbers: ["18001238040"] },
  { name: "Bandhan Bank", numbers: ["18002588181"] },
  { name: "AU Small Finance Bank", numbers: ["18001202586"] },
  { name: "DCB Bank", numbers: ["18001233435"] },
  { name: "CSB Bank", numbers: ["18002667700"] },
  { name: "Jammu & Kashmir Bank", numbers: ["18001800234"] },
  { name: "Tamilnad Mercantile Bank", numbers: ["18004250426"] },
  { name: "India Post Payments Bank", numbers: ["155299"] },
  { name: "Paytm Payments Bank", numbers: ["01204456456"] },
  { name: "Airtel Payments Bank", numbers: ["400"] },
  { name: "Fino Payments Bank", numbers: ["18002665004"] },
];

function fmt(n: string) {
  if (n.length <= 6) return n;
  if (n.startsWith("1800") || n.startsWith("1860")) return `${n.slice(0, 4)} ${n.slice(4, 7)} ${n.slice(7)}`;
  return n;
}

function CallRow({ entry, tone }: { entry: Entry; tone: "red" | "default" }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 flex flex-col gap-3">
      <div>
        <div className="font-semibold text-sm">{entry.name}</div>
        {entry.note && <div className="text-xs text-muted-foreground mt-0.5">{entry.note}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        {entry.numbers.map((n) => (
          <a
            key={n}
            href={`tel:${n}`}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
              tone === "red" ? "bg-alert-red text-white" : "bg-brand-accent text-white"
            }`}
          >
            <Phone className="size-4" /> {fmt(n)}
          </a>
        ))}
      </div>
    </div>
  );
}

function HelplinePage() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const banks = query
    ? BANKS.filter((b) => b.name.toLowerCase().includes(query) || b.numbers.some((n) => n.includes(query)))
    : BANKS;

  return (
    <AppShell title="Helpline">
      <div className="p-6 lg:p-10 max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Emergency & bank helpline numbers</h2>
          <p className="text-muted-foreground mt-1">
            Tap any number to call directly. If money has already left your account, call 1930 first.
          </p>
        </div>

        <section className="mb-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-alert-red mb-3">
            <ShieldAlert className="size-4" /> Report fraud now
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EMERGENCY.map((e) => (
              <CallRow key={e.name} entry={e} tone="red" />
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Landmark className="size-4" /> Bank customer care (24x7)
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 w-full sm:w-72">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search your bank…"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
          </div>

          {banks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No bank matched “{q}”. Check the number printed on the back of your debit card.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {banks.map((b) => (
                <CallRow key={b.name} entry={b} tone="default" />
              ))}
            </div>
          )}
        </section>

        <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-4 text-xs text-muted-foreground flex gap-2">
          <Globe className="size-4 shrink-0 mt-0.5" />
          <span>
            Numbers are published toll-free customer-care lines. Always verify on the bank's official website or the
            back of your card before sharing any information — and never share OTP, PIN or CVV, even with a caller who
            claims to be from your bank.
          </span>
        </div>
      </div>
    </AppShell>
  );
}
