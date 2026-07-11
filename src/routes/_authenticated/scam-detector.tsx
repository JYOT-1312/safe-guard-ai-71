import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeScam } from "@/lib/ai.functions";
import { Upload, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scam-detector")({
  component: ScamDetector,
});

type Result = {
  risk_score: number; risk_level: "safe" | "caution" | "high";
  scam_type: string; explanation: string;
  red_flags: string[]; recommended_actions: string[];
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
          <p className="text-muted-foreground mt-1">Paste text, upload a screenshot, or both. AI returns a risk score in seconds.</p>
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
              <span className="text-sm font-medium">Upload a screenshot (SMS, WhatsApp, UPI request)</span>
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

function ResultCard({ result }: { result: Result }) {
  const config = {
    safe: { bg: "bg-safety-green/5", border: "border-safety-green/30", text: "text-safety-green", icon: ShieldCheck, label: "SAFE" },
    caution: { bg: "bg-alert-amber/5", border: "border-alert-amber/30", text: "text-alert-amber", icon: ShieldQuestion, label: "CAUTION" },
    high: { bg: "bg-alert-red/5", border: "border-alert-red/30", text: "text-alert-red", icon: ShieldAlert, label: "HIGH RISK" },
  }[result.risk_level];
  const Icon = config.icon;

  return (
    <div className={`mt-6 rounded-3xl border-2 p-6 ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-4 mb-6">
        <div className={`size-14 rounded-2xl grid place-items-center ${config.text} bg-white shrink-0`}>
          <Icon className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>{config.label}</div>
          <div className="text-2xl font-bold mt-1">{result.scam_type}</div>
          <div className="mt-2 text-sm text-foreground/80 leading-relaxed">{result.explanation}</div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-4xl font-bold ${config.text}`}>{result.risk_score}%</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Risk</div>
        </div>
      </div>

      {result.red_flags.length > 0 && (
        <div className="mb-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Red Flags</div>
          <ul className="space-y-2">
            {result.red_flags.map((f) => (
              <li key={f} className="flex gap-2 text-sm"><span className={config.text}>•</span> {f}</li>
            ))}
          </ul>
        </div>
      )}

      {result.recommended_actions.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">What to do</div>
          <ol className="space-y-2">
            {result.recommended_actions.map((a, i) => (
              <li key={a} className="flex gap-3 text-sm">
                <span className={`size-6 rounded-full grid place-items-center text-xs font-bold shrink-0 ${config.text} bg-white`}>{i + 1}</span>
                <span className="pt-0.5">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
