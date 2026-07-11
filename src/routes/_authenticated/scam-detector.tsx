import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeScam } from "@/lib/ai.functions";
import { Upload, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, X, RotateCcw, Copy, Share2, Download, Link2, Phone, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scam-detector")({
  component: ScamDetector,
});

type Result = {
  riskScore: number; confidence: number;
  riskLevel: "safe" | "caution" | "high";
  detectedScamType: string;
  extractedText: string;
  detectedLinks: string[];
  detectedPhoneNumbers: string[];
  detectedUPI: string[];
  suspiciousPhrases: string[];
  redFlags: string[];
  summary: string;
  recommendation: string;
  recommendedActions: string[];
};

function ScamDetector() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const call = useServerFn(analyzeScam);

  async function onFile(file: File) {
    if (file.size > 6_000_000) { toast.error("Image too large (max 6MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!text.trim() && !image) { toast.error("Add text or upload a screenshot"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await call({ data: { text: text.trim() || undefined, imageDataUrl: image ?? undefined } });
      setResult(r);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() { setText(""); setImage(null); setResult(null); }

  return (
    <AppShell title="Scam Detector">
      <div className="p-6 lg:p-10 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Check any message or screenshot</h2>
          <p className="text-muted-foreground mt-1">Paste text, upload a screenshot, or both. AI performs OCR and returns a risk report in seconds.</p>
        </div>

        <div className="bg-white border border-border rounded-3xl p-6 space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the suspicious SMS, WhatsApp message, or email here..."
            rows={4}
            className="w-full resize-none px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />

          {image ? (
            <div className="relative inline-block">
              <img src={image} alt="Upload preview" className="max-h-64 rounded-2xl border border-border" />
              <button onClick={() => setImage(null)} className="absolute top-2 right-2 size-8 grid place-items-center bg-black/60 text-white rounded-full">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-border hover:border-brand-accent cursor-pointer transition-colors text-muted-foreground hover:text-brand-accent">
              <Upload className="size-5" />
              <span className="text-sm font-medium">Upload a screenshot (SMS, WhatsApp, UPI request, QR)</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
          )}

          <div className="flex gap-2">
            <button onClick={analyze} disabled={loading} className="px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing...</> : "Analyze"}
            </button>
            <button onClick={reset} disabled={loading} className="px-4 py-3 border border-border rounded-xl font-medium hover:bg-secondary inline-flex items-center gap-2">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        {result && <ResultCard result={result} />}
      </div>
    </AppShell>
  );
}

export function ResultCard({ result, title }: { result: Result; title?: string }) {
  const config = {
    safe: { bg: "bg-safety-green/5", border: "border-safety-green/30", text: "text-safety-green", icon: ShieldCheck, label: "SAFE" },
    caution: { bg: "bg-alert-amber/5", border: "border-alert-amber/30", text: "text-alert-amber", icon: ShieldQuestion, label: "CAUTION" },
    high: { bg: "bg-alert-red/5", border: "border-alert-red/30", text: "text-alert-red", icon: ShieldAlert, label: "HIGH RISK" },
  }[result.riskLevel];
  const Icon = config.icon;

  const asText = () => [
    `SurakshaSetu AI — ${title ?? "Scam Analysis"}`,
    `Risk: ${result.riskScore}% (${result.riskLevel.toUpperCase()})  Confidence: ${result.confidence}%`,
    `Type: ${result.detectedScamType}`,
    ``,
    `Summary: ${result.summary}`,
    `Recommendation: ${result.recommendation}`,
    ``,
    result.redFlags.length ? `Red flags:\n- ${result.redFlags.join("\n- ")}` : "",
    result.detectedLinks.length ? `Links: ${result.detectedLinks.join(", ")}` : "",
    result.detectedPhoneNumbers.length ? `Phones: ${result.detectedPhoneNumbers.join(", ")}` : "",
    result.detectedUPI.length ? `UPI: ${result.detectedUPI.join(", ")}` : "",
    result.recommendedActions.length ? `\nActions:\n- ${result.recommendedActions.join("\n- ")}` : "",
  ].filter(Boolean).join("\n");

  async function copy() {
    try { await navigator.clipboard.writeText(asText()); toast.success("Copied to clipboard"); }
    catch { toast.error("Copy failed"); }
  }
  async function share() {
    const shareData = { title: "SurakshaSetu AI Analysis", text: asText() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(asText()); toast.success("Copied — share it anywhere"); }
    } catch { /* user dismissed */ }
  }
  function download() {
    const blob = new Blob([asText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `surakshasetu-report-${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={`mt-6 rounded-3xl border-2 p-6 ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-4 mb-6">
        <div className={`size-14 rounded-2xl grid place-items-center ${config.text} bg-white shrink-0`}>
          <Icon className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>{config.label}</div>
          <div className="text-2xl font-bold mt-1">{result.detectedScamType}</div>
          <div className="mt-2 text-sm text-foreground/80 leading-relaxed">{result.summary}</div>
          {result.recommendation && <div className={`mt-2 text-sm font-medium ${config.text}`}>→ {result.recommendation}</div>}
        </div>
        <div className="text-right shrink-0">
          <div className={`text-4xl font-bold ${config.text}`}>{result.riskScore}%</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Risk</div>
          <div className="text-xs text-muted-foreground mt-1">conf {result.confidence}%</div>
        </div>
      </div>

      {/* Risk meter */}
      <div className="mb-6">
        <div className="h-2 rounded-full bg-white/60 overflow-hidden">
          <div className={`h-full ${result.riskLevel === "safe" ? "bg-safety-green" : result.riskLevel === "caution" ? "bg-alert-amber" : "bg-alert-red"}`} style={{ width: `${result.riskScore}%` }} />
        </div>
      </div>

      {result.extractedText && (
        <details className="mb-6 group">
          <summary className="text-xs font-bold uppercase tracking-wider text-muted-foreground cursor-pointer">Extracted text (OCR / transcript)</summary>
          <pre className="mt-2 whitespace-pre-wrap text-sm bg-white/70 p-3 rounded-xl border border-border/60 max-h-64 overflow-auto">{result.extractedText}</pre>
        </details>
      )}

      {(result.detectedLinks.length + result.detectedPhoneNumbers.length + result.detectedUPI.length) > 0 && (
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <EntityChipList icon={Link2} label="Links" items={result.detectedLinks} tone={config.text} />
          <EntityChipList icon={Phone} label="Phones" items={result.detectedPhoneNumbers} tone={config.text} />
          <EntityChipList icon={Wallet} label="UPI IDs" items={result.detectedUPI} tone={config.text} />
        </div>
      )}

      {result.redFlags.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Red Flags</div>
          <ul className="space-y-2">
            {result.redFlags.map((f) => (
              <li key={f} className="flex gap-2 text-sm"><span className={config.text}>•</span> {f}</li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendedActions.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">What to do</div>
          <ol className="space-y-2">
            {result.recommendedActions.map((a, i) => (
              <li key={a} className="flex gap-3 text-sm">
                <span className={`size-6 rounded-full grid place-items-center text-xs font-bold shrink-0 ${config.text} bg-white`}>{i + 1}</span>
                <span className="pt-0.5">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-4 border-t border-border/50">
        <button onClick={copy} className="px-3 py-2 text-sm rounded-lg bg-white border border-border hover:bg-secondary inline-flex items-center gap-2"><Copy className="size-4" /> Copy</button>
        <button onClick={share} className="px-3 py-2 text-sm rounded-lg bg-white border border-border hover:bg-secondary inline-flex items-center gap-2"><Share2 className="size-4" /> Share</button>
        <button onClick={download} className="px-3 py-2 text-sm rounded-lg bg-white border border-border hover:bg-secondary inline-flex items-center gap-2"><Download className="size-4" /> Download report</button>
      </div>
    </div>
  );
}

function EntityChipList({ icon: Icon, label, items, tone }: { icon: typeof Link2; label: string; items: string[]; tone: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white/70 border border-border/60 p-3">
      <div className={`text-[10px] font-bold uppercase tracking-wider ${tone} inline-flex items-center gap-1 mb-2`}><Icon className="size-3" /> {label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((v) => <span key={v} className="text-xs px-2 py-1 rounded-md bg-secondary break-all">{v}</span>)}
      </div>
    </div>
  );
}
