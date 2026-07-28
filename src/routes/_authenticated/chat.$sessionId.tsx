import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAI } from "@/lib/ai.functions";
import { Send, Loader2, ShieldCheck, Sparkles, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listSessions,
  createSession,
  deleteSession,
  renameSession,
  loadMessages,
  appendMessage,
  summarizeTitle,
  type ChatMessage,
} from "@/lib/chat-sessions";
import { withApiLog } from "@/lib/api-log";

export const Route = createFileRoute("/_authenticated/chat/$sessionId")({
  component: ChatSessionPage,
});

const SUGGESTIONS = [
  "Someone is asking for my UPI PIN to send me money — is this real?",
  "I got an SMS saying my KYC has expired. What should I do?",
  "A loan app is asking for photo and contacts access. Is it safe?",
];

function ChatSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const call = useServerFn(chatWithAI);

  const sessionsQ = useQuery({ queryKey: ["chat-sessions"], queryFn: listSessions });
  const messagesQ = useQuery({ queryKey: ["chat-messages", sessionId], queryFn: () => loadMessages(sessionId) });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages: ChatMessage[] = messagesQ.data ?? [];
  const isEmpty = !messagesQ.isLoading && messages.length === 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, loading]);

  useEffect(() => { inputRef.current?.focus(); }, [sessionId, loading]);

  const newChat = useMutation({
    mutationFn: () => createSession(),
    onSuccess: (s) => {
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
      navigate({ to: "/chat/$sessionId", params: { sessionId: s.id } });
    },
  });

  async function onDelete(id: string) {
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteSession(id);
      const remaining = (sessionsQ.data ?? []).filter((s) => s.id !== id);
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
      if (id === sessionId) {
        const next = remaining[0];
        if (next) navigate({ to: "/chat/$sessionId", params: { sessionId: next.id }, replace: true });
        else navigate({ to: "/chat", replace: true });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function commitRename(id: string) {
    const v = renameVal.trim();
    if (!v) { setRenamingId(null); return; }
    try {
      await renameSession(id, v);
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setRenamingId(null);
    }
  }

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);
    const optimisticUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      session_id: sessionId,
      user_id: "",
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    qc.setQueryData<ChatMessage[]>(["chat-messages", sessionId], (m) => [...(m ?? []), optimisticUser]);

    try {
      await appendMessage(sessionId, "user", content);
      // auto-title on first message
      if (messages.length === 0) {
        await renameSession(sessionId, summarizeTitle(content));
        qc.invalidateQueries({ queryKey: ["chat-sessions"] });
      }
      const history = [...messages, optimisticUser].slice(-12).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const { reply } = await withApiLog("chat", () => call({ data: { messages: history } }), { model: "google/gemini-3-flash-preview" });
      await appendMessage(sessionId, "assistant", reply);
      qc.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
      qc.invalidateQueries({ queryKey: ["chat-sessions"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI request failed");
      qc.invalidateQueries({ queryKey: ["chat-messages", sessionId] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="AI Chat">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sessions sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-white/60">
          <div className="p-3">
            <button
              onClick={() => newChat.mutate()}
              disabled={newChat.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Plus className="size-4" /> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
            {sessionsQ.isLoading && <div className="p-3 text-xs text-muted-foreground">Loading…</div>}
            {(sessionsQ.data ?? []).map((s) => {
              const active = s.id === sessionId;
              const renaming = renamingId === s.id;
              return (
                <div
                  key={s.id}
                  className={`group rounded-lg px-2 py-1.5 flex items-center gap-1 text-sm ${active ? "bg-brand-accent/10 text-brand-accent" : "hover:bg-secondary text-muted-foreground"}`}
                >
                  {renaming ? (
                    <>
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(s.id); if (e.key === "Escape") setRenamingId(null); }}
                        className="flex-1 min-w-0 px-2 py-1 rounded border border-border bg-white text-foreground"
                      />
                      <button onClick={() => commitRename(s.id)} className="p-1 hover:text-safety-green"><Check className="size-3.5" /></button>
                      <button onClick={() => setRenamingId(null)} className="p-1 hover:text-alert-red"><X className="size-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <Link to="/chat/$sessionId" params={{ sessionId: s.id }} className="flex-1 min-w-0 truncate">
                        {s.title}
                      </Link>
                      <button
                        onClick={() => { setRenamingId(s.id); setRenameVal(s.title); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-foreground"
                        aria-label="Rename"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(s.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-alert-red"
                        aria-label="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Chat pane */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollRef} className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
              {isEmpty && (
                <div className="flex gap-3">
                  <div className="size-8 rounded-full bg-brand-accent/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4 text-brand-accent" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 bg-white border border-border">
                    Hi! I'm your SurakshaSetu AI companion. Paste any suspicious message, describe a call you got, or ask any banking safety question — in any language.
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
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
              {isEmpty && !loading && (
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
      </div>
    </AppShell>
  );
}
