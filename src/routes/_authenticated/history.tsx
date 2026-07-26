import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisRow, AnalysisType } from "@/lib/history";
import { Search, Star, Trash2, Download, FileText, FileSpreadsheet, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, ScanLine, Mic, MessagesSquare, Mail, Link2, QrCode, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  component: History,
  head: () => ({
    meta: [
      { title: "Analysis History · SurakshaSetu AI" },
      { name: "description", content: "Every scan you've run — searchable, exportable, and favoritable." },
    ],
  }),
});

const TYPE_META: Record<AnalysisType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  scam: { label: "Scam Detector", icon: ScanLine },
  voice: { label: "Voice", icon: Mic },
  chat: { label: "Chat", icon: MessagesSquare },
  email: { label: "Email", icon: Mail },
  url: { label: "URL", icon: Link2 },
  qr: { label: "QR", icon: QrCode },
  knowledge: { label: "Knowledge", icon: BookOpen },
};

const TYPE_FILTERS: (AnalysisType | "all")[] = ["all", "scam", "voice", "chat", "email", "url", "qr"];

function riskBucket(r: number): { label: string; cls: string; icon: React.ComponentType<{ className?: string }> } {
  if (r >= 66) return { label: "High", cls: "bg-safety-red/10 text-safety-red border-safety-red/30", icon: ShieldAlert };
  if (r >= 33) return { label: "Caution", cls: "bg-safety-amber/10 text-safety-amber border-safety-amber/30", icon: ShieldQuestion };
  return { label: "Safe", cls: "bg-safety-green/10 text-safety-green border-safety-green/30", icon: ShieldCheck };
}

function History() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<AnalysisType | "all">("all");
  const [favOnly, setFavOnly] = useState(false);

  const { data = [], isLoading } = useQuery({
    queryKey: ["analyses"],
    queryFn: async (): Promise<AnalysisRow[]> => {
      const { data, error } = await supabase
        .from("analyses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter((r) => {
      if (favOnly && !r.favorite) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (needle && !(`${r.title} ${r.summary ?? ""}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [data, q, typeFilter, favOnly]);

  const toggleFav = useMutation({
    mutationFn: async (row: AnalysisRow) => {
      const { error } = await supabase.from("analyses").update({ favorite: !row.favorite }).eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analyses"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["analyses"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  function exportCSV() {
    if (!filtered.length) { toast.error("Nothing to export"); return; }
    const header = ["Time", "Type", "Title", "Risk", "Confidence", "Favorite", "Summary"];
    const rows = filtered.map((r) => [
      new Date(r.created_at).toISOString(),
      r.type,
      r.title,
      String(r.risk),
      String(r.confidence),
      r.favorite ? "yes" : "no",
      (r.summary ?? "").replace(/\s+/g, " "),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `surakshasetu-history-${Date.now()}.csv`);
  }

  function exportPDF() {
    if (!filtered.length) { toast.error("Nothing to export"); return; }
    const html = renderPdfHtml(filtered);
    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked — allow pop-ups to export PDF"); return; }
    w.document.write(html);
    w.document.close();
    // Give the browser a tick to layout, then trigger the print dialog (user picks "Save as PDF")
    setTimeout(() => { w.focus(); w.print(); }, 250);
  }

  return (
    <AppShell title="History">
      <div className="p-6 lg:p-10 max-w-6xl">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold">Analysis history</h2>
            <p className="text-muted-foreground mt-1">Every scan you've run — images, transcripts, chats, emails, URLs and QRs.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="px-3 py-2 rounded-xl border border-border bg-white text-sm font-medium inline-flex items-center gap-2 hover:bg-secondary">
              <FileSpreadsheet className="size-4" /> Export CSV
            </button>
            <button onClick={exportPDF} className="px-3 py-2 rounded-xl border border-border bg-white text-sm font-medium inline-flex items-center gap-2 hover:bg-secondary">
              <FileText className="size-4" /> Export PDF
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[240px] flex items-center gap-2 rounded-xl border-2 border-border focus-within:border-brand-accent px-3 py-2">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or summary…" className="flex-1 bg-transparent outline-none text-sm" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_FILTERS.map((t) => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${typeFilter === t ? "bg-brand-accent text-white border-brand-accent" : "border-border bg-white hover:bg-secondary"}`}>
                {t === "all" ? "All" : TYPE_META[t].label}
              </button>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={favOnly} onChange={(e) => setFavOnly(e.target.checked)} />
            <Star className="size-4 text-safety-amber" /> Favorites only
          </label>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-border bg-white p-12 text-center text-muted-foreground">
            <Loader2 className="size-6 animate-spin mx-auto mb-2 text-brand-accent" /> Loading history…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No entries yet. Run any analyzer and it will appear here automatically.
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Type</th>
                    <th className="text-left px-4 py-3 font-semibold">Title</th>
                    <th className="text-left px-4 py-3 font-semibold">Risk</th>
                    <th className="text-left px-4 py-3 font-semibold">Confidence</th>
                    <th className="text-left px-4 py-3 font-semibold">Time</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const meta = TYPE_META[r.type];
                    const bucket = riskBucket(r.risk);
                    const Icon = meta.icon;
                    const RIcon = bucket.icon;
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Icon className="size-4" /> {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          <div className="font-medium truncate">{r.title}</div>
                          {r.summary && <div className="text-xs text-muted-foreground truncate">{r.summary}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold border ${bucket.cls}`}>
                            <RIcon className="size-3" /> {bucket.label} {r.risk}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.confidence}%</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button title={r.favorite ? "Unfavorite" : "Favorite"} onClick={() => toggleFav.mutate(r)}
                              className="p-2 rounded-lg hover:bg-secondary">
                              <Star className={`size-4 ${r.favorite ? "fill-safety-amber text-safety-amber" : "text-muted-foreground"}`} />
                            </button>
                            <button title="Download JSON" onClick={() => downloadJSON(r)}
                              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                              <Download className="size-4" />
                            </button>
                            <button title="Delete" onClick={() => { if (confirm("Delete this entry?")) del.mutate(r.id); }}
                              className="p-2 rounded-lg hover:bg-safety-red/10 text-safety-red">
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function downloadJSON(row: AnalysisRow) {
  const blob = new Blob([JSON.stringify(row, null, 2)], { type: "application/json" });
  downloadBlob(blob, `analysis-${row.type}-${row.id.slice(0, 8)}.json`);
}

function renderPdfHtml(rows: AnalysisRow[]): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
  const body = rows.map((r) => `
    <tr>
      <td>${esc(new Date(r.created_at).toLocaleString())}</td>
      <td>${esc(r.type)}</td>
      <td>${esc(r.title)}</td>
      <td>${r.risk}</td>
      <td>${r.confidence}%</td>
      <td>${esc(r.summary ?? "")}</td>
    </tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8" />
    <title>SurakshaSetu · Analysis History</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:32px;color:#0f172a}
      h1{margin:0 0 4px}
      .sub{color:#64748b;margin-bottom:24px;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #e2e8f0;padding:8px;text-align:left;vertical-align:top}
      th{background:#f1f5f9;text-transform:uppercase;font-size:10px;letter-spacing:.05em}
      tr:nth-child(even) td{background:#f8fafc}
    </style></head><body>
    <h1>SurakshaSetu · Analysis History</h1>
    <div class="sub">${rows.length} entries · Exported ${new Date().toLocaleString()}</div>
    <table><thead><tr><th>Time</th><th>Type</th><th>Title</th><th>Risk</th><th>Confidence</th><th>Summary</th></tr></thead>
    <tbody>${body}</tbody></table></body></html>`;
}
