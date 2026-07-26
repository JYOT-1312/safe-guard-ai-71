import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeUrl } from "@/lib/ai.functions";
import { ResultCard } from "@/routes/_authenticated/scam-detector";
import { Loader2, Link as LinkIcon, RotateCcw, ShieldCheck, ShieldAlert, Globe, Calendar, Building2, Lock, AlertTriangle, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { saveAnalysis } from "@/lib/history";

export const Route = createFileRoute("/_authenticated/url-analyzer")({
  component: UrlAnalyzer,
});

type UrlResult = Parameters<typeof ResultCard>[0]["result"] & {
  trustScore: number;
  hostname: string;
  registrable: string;
  scheme: string;
  hasSSL: boolean;
  registrar: string | null;
  domainCreated: string | null;
  domainAgeDays: number | null;
  domainExpires: string | null;
  typosquatSuspected: boolean;
  nearestKnownBrand: string | null;
  hasIPHost: boolean;
  hasSuspiciousTld: boolean;
  googleSafeBrowsing: string;
  virusTotal: string;
  screenshotUrl: string;
  analyzedUrl: string;
};

function UrlAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UrlResult | null>(null);
  const [imgErr, setImgErr] = useState(false);
  const call = useServerFn(analyzeUrl);

  async function analyze() {
    if (!url.trim()) { toast.error("Enter a URL to check"); return; }
    setLoading(true); setResult(null); setImgErr(false);
    try {
      const r = await call({ data: { url: url.trim() } }) as UrlResult;
      setResult(r);
      void saveAnalysis({ type: "url", title: r.hostname || r.analyzedUrl || url.trim(), summary: r.summary, risk: r.riskScore, confidence: r.confidence, payload: r });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoading(false); }
  }

  function reset() { setUrl(""); setResult(null); setImgErr(false); }

  return (
    <AppShell title="URL Analyzer">
      <div className="p-6 lg:p-10 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Check a suspicious link</h2>
          <p className="text-muted-foreground mt-1">SSL, WHOIS, domain age, typosquatting and phishing signals — before you click.</p>
        </div>

        <div className="rounded-3xl border border-border bg-white p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL</label>
            <div className="mt-2 flex items-center gap-2 rounded-2xl border-2 border-border focus-within:border-brand-accent px-3 py-2 bg-white">
              <LinkIcon className="size-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") analyze(); }}
                placeholder="https://example.com/verify-kyc"
                className="flex-1 bg-transparent outline-none text-sm"
                autoComplete="off" spellCheck={false}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">We never open the link on your device. Analysis runs safely on our servers.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button onClick={analyze} disabled={loading || !url.trim()} className="px-5 py-2.5 rounded-xl bg-brand-accent text-white font-medium inline-flex items-center gap-2 disabled:opacity-50">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing…</> : <><ShieldCheck className="size-4" /> Analyze URL</>}
            </button>
            <button onClick={reset} disabled={loading} className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm inline-flex items-center gap-2 disabled:opacity-50">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className="mt-6 rounded-3xl border border-border bg-white overflow-hidden">
              <div className="grid md:grid-cols-2">
                <div className="p-6 border-b md:border-b-0 md:border-r border-border">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Trust score</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <div className={`text-5xl font-bold ${result.trustScore >= 70 ? "text-safety-green" : result.trustScore >= 40 ? "text-alert-amber" : "text-alert-red"}`}>{result.trustScore}</div>
                    <div className="text-sm text-muted-foreground">/ 100</div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full ${result.trustScore >= 70 ? "bg-safety-green" : result.trustScore >= 40 ? "bg-alert-amber" : "bg-alert-red"}`} style={{ width: `${result.trustScore}%` }} />
                  </div>

                  <dl className="mt-6 space-y-3 text-sm">
                    <Row icon={Globe} label="Hostname" value={result.hostname} />
                    <Row icon={Lock} label="SSL" value={result.hasSSL ? "Valid HTTPS reachable" : "No HTTPS / handshake failed"} tone={result.hasSSL ? "ok" : "bad"} />
                    <Row icon={Building2} label="Registrar" value={result.registrar ?? "Unknown"} />
                    <Row icon={Calendar} label="Domain age" value={result.domainAgeDays != null ? `${result.domainAgeDays} days` : "Unknown"} tone={result.domainAgeDays != null && result.domainAgeDays < 90 ? "bad" : undefined} />
                    <Row icon={Calendar} label="Created" value={result.domainCreated ? new Date(result.domainCreated).toLocaleDateString() : "Unknown"} />
                    {result.typosquatSuspected && result.nearestKnownBrand && (
                      <Row icon={AlertTriangle} label="Typosquat" value={`Looks like "${result.nearestKnownBrand}"`} tone="bad" />
                    )}
                    {result.hasIPHost && <Row icon={AlertTriangle} label="IP hostname" value="Uses raw IP address" tone="bad" />}
                    {result.hasSuspiciousTld && <Row icon={AlertTriangle} label="TLD" value="Uncommon / abused TLD" tone="bad" />}
                  </dl>

                  <div className="mt-6 text-[11px] text-muted-foreground leading-relaxed">
                    Google Safe Browsing: <span className="font-mono">{result.googleSafeBrowsing}</span><br />
                    VirusTotal: <span className="font-mono">{result.virusTotal}</span>
                  </div>
                </div>

                <div className="p-6 bg-secondary/40">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Screenshot preview</div>
                  {imgErr ? (
                    <div className="aspect-[8/5] rounded-2xl border border-dashed border-border grid place-items-center text-muted-foreground text-sm bg-white">
                      <div className="text-center"><ImageOff className="size-6 mx-auto mb-2" /> Preview unavailable</div>
                    </div>
                  ) : (
                    <img
                      src={result.screenshotUrl}
                      alt={`Preview of ${result.hostname}`}
                      className="w-full aspect-[8/5] object-cover rounded-2xl border border-border bg-white"
                      loading="lazy"
                      onError={() => setImgErr(true)}
                    />
                  )}
                  <div className="mt-3 text-xs text-muted-foreground break-all">{result.analyzedUrl}</div>
                </div>
              </div>
            </div>

            <ResultCard result={result} title="URL Analysis" />
          </>
        )}

        {!result && !loading && (
          <div className="mt-6 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            <ShieldAlert className="size-8 mx-auto mb-2 text-brand-accent" />
            Paste any link from SMS, WhatsApp or email to check if it's safe to open.
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Row({ icon: Icon, label, value, tone }: { icon: typeof Globe; label: string; value: string; tone?: "ok" | "bad" }) {
  const color = tone === "ok" ? "text-safety-green" : tone === "bad" ? "text-alert-red" : "text-foreground";
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`text-sm font-medium break-all ${color}`}>{value}</div>
      </div>
    </div>
  );
}
