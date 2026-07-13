import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeEmail } from "@/lib/ai.functions";
import { ResultCard } from "@/routes/_authenticated/scam-detector";
import { Loader2, RotateCcw, Mail, ShieldAlert, ShieldCheck, AlertTriangle, Paperclip, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/email-analyzer")({
  component: EmailAnalyzer,
});

type EmailResult = Parameters<typeof ResultCard>[0]["result"] & {
  senderDomain: string;
  replyToDomain: string;
  domainMismatch: boolean;
  domainTrust: "trusted" | "unknown" | "suspicious" | "spoofed";
  senderReputation: "good" | "unknown" | "poor";
  suspiciousAttachments: string[];
  trackingPixels: boolean;
};

function EmailAnalyzer() {
  const [sender, setSender] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [rawHeaders, setRawHeaders] = useState("");
  const [showHeaders, setShowHeaders] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const call = useServerFn(analyzeEmail);

  async function analyze() {
    if (!body.trim()) { toast.error("Paste the email body first"); return; }
    setLoading(true); setResult(null);
    try {
      const r = await call({ data: {
        sender: sender.trim() || undefined,
        replyTo: replyTo.trim() || undefined,
        subject: subject.trim() || undefined,
        body: body.trim(),
        rawHeaders: rawHeaders.trim() || undefined,
      }});
      setResult(r as EmailResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally { setLoading(false); }
  }

  function reset() {
    setSender(""); setReplyTo(""); setSubject(""); setBody(""); setRawHeaders(""); setResult(null);
  }

  return (
    <AppShell title="Email Analyzer">
      <div className="p-6 lg:p-10 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Analyze a suspicious email</h2>
          <p className="text-muted-foreground mt-1">Paste sender, subject, and body. AI checks for spoofed domains, reply-to mismatch, tracking pixels, and phishing patterns.</p>
        </div>

        <div className="bg-white border border-border rounded-3xl p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="From (sender email)" value={sender} onChange={setSender} placeholder="alerts@paypa1.com" />
            <Field label="Reply-To" value={replyTo} onChange={setReplyTo} placeholder="support@random-domain.xyz" />
          </div>
          <Field label="Subject" value={subject} onChange={setSubject} placeholder="Urgent: Your account will be blocked" />

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block inline-flex items-center gap-1"><Mail className="size-3" /> Email body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste the full email body here..."
              rows={10}
              className="w-full resize-none px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
          </div>

          <button type="button" onClick={() => setShowHeaders((s) => !s)} className="text-xs font-medium text-brand-accent hover:underline">
            {showHeaders ? "Hide" : "Add"} raw headers (optional)
          </button>
          {showHeaders && (
            <textarea
              value={rawHeaders}
              onChange={(e) => setRawHeaders(e.target.value)}
              placeholder="Received: from ...\nAuthentication-Results: ...\nDKIM-Signature: ..."
              rows={5}
              className="w-full resize-none px-4 py-3 rounded-2xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent font-mono text-xs"
            />
          )}

          <div className="flex gap-2">
            <button onClick={analyze} disabled={loading} className="px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Analyzing...</> : "Analyze email"}
            </button>
            <button onClick={reset} disabled={loading} className="px-4 py-3 border border-border rounded-xl font-medium hover:bg-secondary inline-flex items-center gap-2">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        {result && (
          <>
            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <SignalCard label="Domain Trust" value={result.domainTrust} tone={trustTone(result.domainTrust)} />
              <SignalCard label="Sender Reputation" value={result.senderReputation} tone={repTone(result.senderReputation)} />
              <SignalCard label="Reply-To" value={result.domainMismatch ? "Mismatch" : "OK"} tone={result.domainMismatch ? "bad" : "good"} />
              <SignalCard label="Tracking Pixel" value={result.trackingPixels ? "Detected" : "None"} tone={result.trackingPixels ? "warn" : "good"} />
            </div>

            {(result.senderDomain || result.replyToDomain) && (
              <div className="mt-4 bg-white border border-border rounded-2xl p-4 grid sm:grid-cols-2 gap-3 text-sm">
                {result.senderDomain && <div><span className="text-xs uppercase tracking-wider text-muted-foreground">From domain</span><div className="font-mono mt-1 break-all">{result.senderDomain}</div></div>}
                {result.replyToDomain && <div><span className="text-xs uppercase tracking-wider text-muted-foreground">Reply-to domain</span><div className="font-mono mt-1 break-all">{result.replyToDomain}</div></div>}
              </div>
            )}

            {result.suspiciousAttachments.length > 0 && (
              <div className="mt-4 bg-alert-red/5 border border-alert-red/30 rounded-2xl p-4">
                <div className="text-xs font-bold uppercase tracking-wider text-alert-red mb-2 inline-flex items-center gap-1"><Paperclip className="size-3" /> Suspicious attachments</div>
                <ul className="text-sm space-y-1">
                  {result.suspiciousAttachments.map((a) => <li key={a} className="font-mono break-all">• {a}</li>)}
                </ul>
              </div>
            )}

            <ResultCard result={result} title="Email Analysis" />
          </>
        )}
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm" />
    </div>
  );
}

function SignalCard({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" | "neutral" }) {
  const styles = {
    good: { bg: "bg-safety-green/5", border: "border-safety-green/30", text: "text-safety-green", Icon: ShieldCheck },
    warn: { bg: "bg-alert-amber/5", border: "border-alert-amber/30", text: "text-alert-amber", Icon: AlertTriangle },
    bad: { bg: "bg-alert-red/5", border: "border-alert-red/30", text: "text-alert-red", Icon: ShieldAlert },
    neutral: { bg: "bg-secondary", border: "border-border", text: "text-muted-foreground", Icon: Eye },
  }[tone];
  const Icon = styles.Icon;
  return (
    <div className={`rounded-2xl border p-4 ${styles.bg} ${styles.border}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold inline-flex items-center gap-1.5 capitalize ${styles.text}`}>
        <Icon className="size-4" /> {value}
      </div>
    </div>
  );
}

function trustTone(v: string): "good" | "warn" | "bad" | "neutral" {
  if (v === "trusted") return "good";
  if (v === "suspicious") return "warn";
  if (v === "spoofed") return "bad";
  return "neutral";
}
function repTone(v: string): "good" | "warn" | "bad" | "neutral" {
  if (v === "good") return "good";
  if (v === "poor") return "bad";
  return "neutral";
}
