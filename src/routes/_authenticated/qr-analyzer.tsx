import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeQR } from "@/lib/ai.functions";
import { ResultCard } from "@/routes/_authenticated/scam-detector";
import { Loader2, Upload, ScanLine, RotateCcw, ShieldAlert, QrCode, Wallet, Link as LinkIcon, Phone, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import jsQR from "jsqr";
import { saveAnalysis } from "@/lib/history";

export const Route = createFileRoute("/_authenticated/qr-analyzer")({
  component: QRAnalyzer,
});

type QRResult = Parameters<typeof ResultCard>[0]["result"] & {
  qrType: string;
  qrIntent: string;
  upi: { vpa: string; name?: string; amount?: string; note?: string; ref?: string } | null;
  url: string | null;
  phone: string | null;
  explanation: string;
  rawContent: string;
};

async function decodeQRFromFile(file: File): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("Failed to read image"));
    r.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Failed to load image"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  const maxDim = 1200;
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: "attemptBoth" });
  if (!code || !code.data) throw new Error("No QR code found in image");
  return code.data;
}

function QRAnalyzer() {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QRResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const call = useServerFn(analyzeQR);

  async function onFile(file: File) {
    if (file.size > 8_000_000) { toast.error("Image too large (max 8MB)"); return; }
    try {
      const [decoded, dataUrl] = await Promise.all([
        decodeQRFromFile(file),
        new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(file); }),
      ]);
      setContent(decoded);
      setPreview(dataUrl);
      toast.success("QR decoded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not decode QR");
    }
  }

  async function analyze() {
    const c = content.trim();
    if (!c) { toast.error("Upload a QR image or paste the QR content"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await call({ data: { content: c } }) as QRResult;
      setResult(r);
      void saveAnalysis({ type: "qr", title: `${r.qrType || "QR"} · ${r.qrIntent || "scan"}`, summary: r.summary, risk: r.riskScore, confidence: r.confidence, payload: r });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoading(false); }
  }

  function reset() { setContent(""); setPreview(null); setResult(null); }

  return (
    <AppShell title="QR Analyzer">
      <div className="p-6 lg:p-10 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Is this QR safe to scan?</h2>
          <p className="text-muted-foreground mt-1">Detect fake UPI collect requests, phishing URLs, and disguised payment traps — before you enter your PIN.</p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Upload QR image</label>
            <div className="mt-2">
              <input ref={inputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ""; }} />
              <button onClick={() => inputRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-border hover:border-brand-accent transition-colors p-6 text-left flex items-center gap-4">
                {preview ? (
                  <img src={preview} alt="QR preview" className="size-20 rounded-xl object-cover border border-border" />
                ) : (
                  <div className="size-20 rounded-xl bg-secondary grid place-items-center"><QrCode className="size-8 text-muted-foreground" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{preview ? "Replace QR image" : "Choose a QR image"}</div>
                  <div className="text-xs text-muted-foreground mt-1">Screenshot from WhatsApp, gallery, or camera. Never opened on your device.</div>
                </div>
                <Upload className="size-5 text-muted-foreground shrink-0" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Or paste QR content</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="upi://pay?pa=someone@bank&pn=Name&am=500"
              rows={3}
              className="mt-2 w-full rounded-2xl border-2 border-border focus:border-brand-accent px-3 py-2 bg-white text-sm font-mono outline-none resize-y" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={analyze} disabled={loading || !content.trim()} className="px-5 py-2.5 rounded-xl bg-brand-accent text-white font-medium inline-flex items-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : <><ScanLine className="size-4" /> Analyze QR</>}
            </button>
            <button onClick={reset} disabled={loading} className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm inline-flex items-center gap-2 disabled:opacity-50">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className="mt-6 rounded-3xl border border-border bg-white p-6">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detected</span>
                <span className="px-2.5 py-1 rounded-full bg-brand-primary text-white text-xs font-semibold">{result.qrType.toUpperCase()}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${result.qrIntent === "collect_request" ? "bg-alert-red text-white" : result.qrIntent === "payment_request" ? "bg-alert-amber text-black" : "bg-secondary text-foreground"}`}>
                  {result.qrIntent.replace(/_/g, " ")}
                </span>
              </div>

              {result.qrIntent === "collect_request" && (
                <div className="mb-4 flex items-start gap-3 p-4 rounded-2xl bg-alert-red/10 border border-alert-red/30">
                  <AlertTriangle className="size-5 text-alert-red shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-bold text-alert-red">This is a COLLECT REQUEST</div>
                    <div className="text-foreground/80 mt-1">Approving this will PULL money from your account — it does not send money to you. Only approve requests you initiated yourself.</div>
                  </div>
                </div>
              )}

              {result.upi && (
                <dl className="grid sm:grid-cols-2 gap-4">
                  <Field icon={Wallet} label="Payee VPA" value={result.upi.vpa || "—"} />
                  <Field icon={Wallet} label="Payee name" value={result.upi.name || "Not provided"} />
                  <Field icon={Wallet} label="Amount" value={result.upi.amount ? `₹ ${result.upi.amount}` : "Not fixed"} />
                  <Field icon={Wallet} label="Note" value={result.upi.note || "—"} />
                </dl>
              )}
              {result.url && <Field icon={LinkIcon} label="URL" value={result.url} />}
              {result.phone && <Field icon={Phone} label="Phone" value={result.phone} />}
              {!result.upi && !result.url && !result.phone && (
                <div className="text-sm text-muted-foreground break-all font-mono p-3 rounded-xl bg-secondary">{result.rawContent}</div>
              )}

              <div className="mt-5 pt-5 border-t border-border">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">What happens if you scan this</div>
                <p className="text-sm leading-relaxed">{result.explanation}</p>
              </div>
            </div>

            <ResultCard result={result} title="QR Analysis" />
          </>
        )}

        {!result && !loading && (
          <div className="mt-6 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ShieldAlert className="size-8 mx-auto mb-2 text-brand-accent" />
            Upload any QR screenshot or paste its content. We'll tell you exactly what it will do.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-all">{value}</div>
      </div>
    </div>
  );
}
