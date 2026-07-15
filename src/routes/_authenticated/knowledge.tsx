import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askKnowledge } from "@/lib/ai.functions";
import { Loader2, BookOpen, Send, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/knowledge")({
  component: Knowledge,
});

type Source = { tag: string; id: string; source: string; title: string; url: string; used: boolean };
type Answer = { answer: string; confidence: number; sources: Source[]; relatedArticles: string[]; question: string };

const EXAMPLES = [
  "What is a UPI collect request and how do I avoid the scam?",
  "How do I report cyber fraud within the golden hour?",
  "How can I spot a fake loan app?",
  "Does the RBI ever call to ask for KYC verification?",
];

function Knowledge() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const call = useServerFn(askKnowledge);

  async function ask(question?: string) {
    const query = (question ?? q).trim();
    if (!query) { toast.error("Type a question"); return; }
    setQ(query);
    setLoading(true); setAnswer(null);
    try {
      const r = await call({ data: { question: query } });
      setAnswer(r as Answer);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally { setLoading(false); }
  }

  return (
    <AppShell title="Knowledge Engine">
      <div className="p-6 lg:p-10 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Ask a safety question</h2>
          <p className="text-muted-foreground mt-1">Answers grounded in RBI, NPCI, CERT-In and cybercrime.gov.in guidance — with sources.</p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6">
          <div className="flex items-center gap-2 rounded-2xl border-2 border-border focus-within:border-brand-accent px-3 py-2">
            <BookOpen className="size-4 text-muted-foreground shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
              placeholder="e.g. Is it safe to scan a QR sent by a stranger?"
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <button onClick={() => ask()} disabled={loading || !q.trim()}
              className="px-4 py-2 rounded-xl bg-brand-accent text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Ask
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => ask(ex)} disabled={loading}
                className="px-3 py-1.5 rounded-full border border-border text-xs bg-white hover:bg-secondary disabled:opacity-50">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="mt-6 rounded-3xl border border-border bg-white p-10 text-center text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-brand-accent" />
            Retrieving guidance and drafting an answer…
          </div>
        )}

        {answer && (
          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border border-border bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-accent">
                  <Sparkles className="size-4" /> Answer
                </div>
                <div className="text-xs text-muted-foreground">Confidence <span className="font-semibold text-foreground">{answer.confidence}%</span></div>
              </div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">{answer.answer}</div>
            </div>

            <div className="rounded-3xl border border-border bg-white p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sources</div>
              <ul className="space-y-3">
                {answer.sources.map((s) => (
                  <li key={s.id} className={`p-3 rounded-2xl border ${s.used ? "border-brand-accent/40 bg-brand-accent/5" : "border-border bg-white"}`}>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-brand-primary text-white shrink-0">{s.tag}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{s.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{s.source}</div>
                      </div>
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-brand-accent inline-flex items-center gap-1 text-xs font-medium shrink-0">
                        Open <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {answer.relatedArticles.length > 0 && (
              <div className="rounded-3xl border border-border bg-white p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Related learning</div>
                <ul className="space-y-2">
                  {answer.relatedArticles.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm">
                      <ShieldCheck className="size-4 text-brand-accent mt-0.5 shrink-0" /> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!answer && !loading && (
          <div className="mt-6 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <BookOpen className="size-8 mx-auto mb-2 text-brand-accent" />
            Every answer cites the exact RBI / NPCI / CERT-In snippet it came from.
          </div>
        )}
      </div>
    </AppShell>
  );
}
