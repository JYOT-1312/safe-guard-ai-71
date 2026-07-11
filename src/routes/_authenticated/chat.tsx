import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAI } from "@/lib/ai.functions";
import { Send, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Someone is asking for my UPI PIN to send me money — is this real?",
  "I got an SMS saying my KYC has expired. What should I do?",
  "A loan app is asking for photo and contacts access. Is it safe?",
];

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! I'm your SurakshaSetu AI companion. Paste any suspicious message, describe a call you got, or ask any banking safety question — in any language." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const call = useServerFn(chatWithAI);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => { inputRef.current?.focus(); }, [loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await call({ data: { messages: next.slice(-12) } });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="AI Chat">
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="size-8 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4 text-brand-accent" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[85%] whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-brand-primary text-white" : "bg-white border border-border"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-brand-accent/10 flex items-center justify-center">
                  <ShieldCheck className="size-4 text-brand-accent" />
                </div>
                <div className="rounded-2xl px-4 py-3 bg-white border border-border inline-flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            {messages.length === 1 && !loading && (
              <div className="grid gap-2 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><Sparkles className="size-3" /> Try asking</div>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-left px-4 py-3 rounded-xl border border-border bg-white hover:border-brand-accent hover:bg-brand-accent/5 transition-colors text-sm">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-white/80 backdrop-blur">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="max-w-3xl mx-auto px-4 py-4 flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Type or paste a suspicious message..."
              className="flex-1 resize-none px-4 py-3 rounded-2xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent max-h-40"
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()} className="size-12 rounded-2xl bg-brand-accent text-white grid place-items-center disabled:opacity-40 hover:opacity-90 shrink-0">
              {loading ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
