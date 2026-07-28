import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHasRole } from "@/hooks/use-role";
import { Loader2, ShieldAlert, Activity, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type LogRow = {
  id: string;
  user_id: string | null;
  tool: string;
  model: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  status: string;
  error: string | null;
  created_at: string;
};

function AdminPage() {
  const { has, isLoading: rolesLoading } = useHasRole("admin");

  const logsQ = useQuery({
    enabled: has,
    queryKey: ["admin-api-logs"],
    queryFn: async (): Promise<LogRow[]> => {
      const { data, error } = await supabase
        .from("api_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
    refetchInterval: 15_000,
  });

  if (rolesLoading) {
    return (
      <AppShell title="Admin">
        <div className="p-10 inline-flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking access…
        </div>
      </AppShell>
    );
  }

  if (!has) {
    return (
      <AppShell title="Admin">
        <div className="p-10 max-w-md">
          <div className="bg-white border-2 border-alert-red/30 rounded-3xl p-6 text-center">
            <ShieldAlert className="size-8 text-alert-red mx-auto" />
            <h2 className="mt-3 font-bold text-lg">Admin access only</h2>
            <p className="text-sm text-muted-foreground mt-1">You don't have permission to view this page.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const rows = logsQ.data ?? [];
  const total = rows.length;
  const errors = rows.filter((r) => r.status !== "ok").length;
  const avgLatency = rows.length ? Math.round(rows.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / rows.length) : 0;

  return (
    <AppShell title="Admin">
      <div className="p-6 lg:p-10 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">API observability</h2>
          <p className="text-muted-foreground mt-1">Latest 200 AI Gateway calls. Refreshes every 15s.</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Stat icon={Activity} label="Calls" value={total.toString()} tone="brand-accent" />
          <Stat icon={AlertTriangle} label="Errors" value={errors.toString()} tone={errors > 0 ? "alert-red" : "safety-green"} />
          <Stat icon={Clock} label="Avg latency" value={`${avgLatency} ms`} tone="brand-primary" />
        </div>

        <div className="bg-white border border-border rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">When</th>
                  <th className="text-left px-4 py-3">Tool</th>
                  <th className="text-left px-4 py-3">Model</th>
                  <th className="text-left px-4 py-3">Latency</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logsQ.isLoading && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground"><Loader2 className="size-4 animate-spin inline mr-2" /> Loading…</td></tr>
                )}
                {!logsQ.isLoading && rows.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No calls logged yet.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 font-semibold">{r.tool}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.model ?? "—"}</td>
                    <td className="px-4 py-3">{r.latency_ms ?? "—"} ms</td>
                    <td className="px-4 py-3">
                      {r.status === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-safety-green"><CheckCircle2 className="size-3.5" /> ok</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-alert-red"><AlertTriangle className="size-3.5" /> {r.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-alert-red truncate max-w-xs" title={r.error ?? ""}>{r.error ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: string; tone: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`size-10 rounded-xl bg-${tone}/10 text-${tone} grid place-items-center`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}
