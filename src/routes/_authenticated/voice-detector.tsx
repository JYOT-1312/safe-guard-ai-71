import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { analyzeAudio } from "@/lib/ai.functions";
import { ResultCard } from "@/routes/_authenticated/scam-detector";
import { Mic, Square, Play, Pause, Upload, RotateCcw, Loader2, Download, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { saveAnalysis } from "@/lib/history";
import { ResultCard } from "./scam-detector";

export const Route = createFileRoute("/_authenticated/voice-detector")({
  component: VoiceDetector,
});

type FullResult = {
  transcript: string;
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

const ACCEPT_MIMES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/aac", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/webm", "audio/ogg"];

function VoiceDetector() {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FullResult | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const call = useServerFn(analyzeAudio);

  useEffect(() => () => {
    stopMeter();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopMeter() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  async function startRecording() {
    try {
      resetResult();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setAudioUrl(url);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      startTimeRef.current = Date.now();
      setElapsed(0);
      elapsedTimerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 250);

      // Level meter
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 3));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setRecording(false);
    stopMeter();
    setLevel(0);
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
  }

  async function onFile(file: File) {
    if (!ACCEPT_MIMES.includes(file.type) && !/\.(mp3|wav|m4a|aac|webm|ogg|mp4)$/i.test(file.name)) {
      toast.error("Unsupported audio format"); return;
    }
    if (file.size > 15_000_000) { toast.error("Audio too large (max 15MB)"); return; }
    resetResult();
    setBlob(file);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(URL.createObjectURL(file));
  }

  function resetResult() { setResult(null); }
  function resetAll() {
    stopRecording();
    setBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setResult(null);
    setElapsed(0);
  }

  async function analyze() {
    if (!blob) { toast.error("Record or upload audio first"); return; }
    setLoading(true); setResult(null);
    try {
      const dataUrl = await blobToDataUrl(blob);
      const r = await call({ data: { audioDataUrl: dataUrl, mimeType: blob.type || "audio/webm" } });
      setResult(r);
      void saveAnalysis({ type: "voice", title: r.detectedScamType || "Voice recording", summary: r.summary, risk: r.riskScore, confidence: r.confidence, payload: r });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  function downloadTranscript() {
    if (!result?.transcript) return;
    const blobT = new Blob([result.transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blobT);
    const a = document.createElement("a");
    a.href = url; a.download = `transcript-${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Voice Scam Detector">
      <div className="p-6 lg:p-10 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Check a suspicious call</h2>
          <p className="text-muted-foreground mt-1">Record the caller or upload an MP3/WAV/M4A. AI transcribes and flags scam patterns.</p>
        </div>

        <div className="bg-white border border-border rounded-3xl p-6 space-y-5">
          {/* Recorder */}
          <div className="flex flex-col items-center gap-4 py-4">
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className={`size-24 rounded-full grid place-items-center text-white shadow-lg transition-all ${recording ? "bg-alert-red animate-pulse" : "bg-brand-accent hover:scale-105"}`}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              {recording ? <Square className="size-8" /> : <Mic className="size-9" />}
            </button>
            <div className="text-sm text-muted-foreground">
              {recording ? (
                <span className="font-mono">{formatTime(elapsed)} — Recording...</span>
              ) : (
                blob ? "Ready to analyze" : "Tap to record"
              )}
            </div>
            {recording && (
              <div className="w-full max-w-xs h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-alert-red transition-[width] duration-75" style={{ width: `${level * 100}%` }} />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <label className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 border-dashed border-border hover:border-brand-accent cursor-pointer transition-colors text-muted-foreground hover:text-brand-accent">
            <Upload className="size-5" />
            <span className="text-sm font-medium">Upload audio file (MP3, WAV, M4A, AAC, WEBM, OGG · max 15MB)</span>
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>

          {audioUrl && (
            <div className="rounded-2xl border border-border p-3 bg-secondary/50">
              <audio ref={audioElRef} src={audioUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} className="hidden" />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { if (!audioElRef.current) return; if (playing) audioElRef.current.pause(); else audioElRef.current.play(); }}
                  className="size-10 rounded-full bg-brand-accent text-white grid place-items-center"
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </button>
                <div className="text-sm">
                  <div className="font-medium">Recorded audio</div>
                  <div className="text-xs text-muted-foreground">{blob ? `${(blob.size / 1024).toFixed(0)} KB · ${blob.type || "audio"}` : ""}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={analyze} disabled={loading || !blob} className="px-6 py-3 bg-brand-accent text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-2">
              {loading ? <><Loader2 className="size-4 animate-spin" /> Transcribing & analyzing...</> : "Analyze"}
            </button>
            <button onClick={resetAll} disabled={loading} className="px-4 py-3 border border-border rounded-xl font-medium hover:bg-secondary inline-flex items-center gap-2">
              <RotateCcw className="size-4" /> Reset
            </button>
          </div>
        </div>

        {result?.transcript && (
          <div className="mt-6 bg-white border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Transcript</div>
              <button onClick={downloadTranscript} className="text-xs inline-flex items-center gap-1 text-brand-accent hover:underline">
                <Download className="size-3" /> Download
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed">{result.transcript}</pre>
          </div>
        )}

        {result && <ResultCard result={result} title="Voice Scam Analysis" />}
      </div>
    </AppShell>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Failed to read audio"));
    r.readAsDataURL(blob);
  });
}
