import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeChat } from "@/lib/ai.functions";
import { ResultCard } from "@/routes/_authenticated/scam-detector";
import { Loader2, RotateCcw, MessageSquare, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat-analyzer")({
  component: ChatAnalyzer,
});

const PLATFORMS = ["WhatsApp", "SMS", "Telegram", "Messenger", "Other"] as const;
type Platform = typeof PLATFORMS[number];

type ChatResult = Parameters<typeof ResultCard>[0]["result"] & {
  category: string;
  platform: string;
  reason: string;
  relatedLearning: { slug: string; title: string } | null;
};

function ChatAnalyzer() {
  const [platform, setPlatform] = useState<Platform>("WhatsApp");
  const [conversation, setConversation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChatResult | null>(null);
  const call = useServerFn(analyzeChat);

  async function analyze() {
    if (!conversation.trim()) { toast.error("Paste the chat conversation first"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await call({ data: { conversation: conversation.trim(), platform } });
      setResult(r as ChatResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoading(false); }
  }

  function reset() { setConversation(""); setResult(null); }

  return (
    <AppShell title="Chat Analyzer">
      <div className="p-6 lg:p-10 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Analyze a chat conversation</h2>
          <p className="text-muted-foreground mt-1">Paste chats from WhatsApp, SMS, Telegram, or Messenger. AI detects scams, emotional manipulation, fake jobs, lottery, crypto & loan traps.</p>
        </div>

        <div className="bg-white border border-border rounded-3xl p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} onClick={() => setPlatform(p)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${platform === p ? "bg-brand-accent text-white border-brand-accent" : "border-border bg-white hover:bg-secondary"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block inline-flex items-center gap-1"><MessageSquare className="size-3" /> Conversation</label>
            <textarea
              value={conversation}
              onChange={(e) => setConversation(e.target.value)}
              placeholder={`Paste the ${platform} conversation here...\n\nExample:\n[10:24 AM] Unknown: Congrats! You won ₹25,00,000...\n[10:25 AM] You: really?`}
              rows={10}
              className="w-full resize-none px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={analyze} disabled={loading} className="px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing...</> : "Analyze conversation"}
            </button>
            <button onClick={reset} disabled={loading} className="px-4 py-3 border border-border rounded-xl font-medium hover:bg-secondary inline-flex items-center gap-2">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <StatCard label="Platform" value={result.platform} />
              <StatCard label="Category" value={result.category} />
              <StatCard label="Confidence" value={`${result.confidence}%`} />
            </div>
            <ResultCard result={result} title="Chat Analysis" />
            {result.reason && result.reason !== result.summary && (
              <div className="mt-4 bg-white border border-border rounded-2xl p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Why we flagged this</div>
                <p className="text-sm leading-relaxed">{result.reason}</p>
              </div>
            )}
            {result.relatedLearning && (
              <Link to="/learn" className="mt-4 flex items-center gap-3 bg-brand-accent/5 border border-brand-accent/30 rounded-2xl p-4 hover:bg-brand-accent/10 transition-colors">
                <div className="size-10 rounded-xl grid place-items-center bg-brand-accent/10 text-brand-accent shrink-0"><GraduationCap className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-accent">Related Learning</div>
                  <div className="font-semibold truncate">{result.relatedLearning.title}</div>
                </div>
                <div className="text-brand-accent text-sm font-medium">Open →</div>
              </Link>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}
