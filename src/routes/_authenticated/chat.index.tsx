import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSessions, createSession } from "@/lib/chat-sessions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chat/")({
  component: ChatIndex,
});

function ChatIndex() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ["chat-sessions"], queryFn: listSessions });

  useEffect(() => {
    if (!data) return;
    (async () => {
      const target = data[0] ?? (await createSession());
      navigate({ to: "/chat/$sessionId", params: { sessionId: target.id }, replace: true });
    })();
  }, [data, navigate]);

  return (
    <AppShell title="AI Chat">
      <div className="p-10 flex items-center gap-2 text-muted-foreground">
        {error ? <span className="text-alert-red">Failed to open chat: {(error as Error).message}</span>
          : (<><Loader2 className="size-4 animate-spin" /> {isLoading ? "Loading conversations…" : "Opening chat…"}</>)}
      </div>
    </AppShell>
  );
}
