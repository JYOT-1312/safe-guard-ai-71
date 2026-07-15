import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_CHAT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_STT = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";
const MODEL_CHAT = "google/gemini-3-flash-preview";
const MODEL_STT = "openai/gpt-4o-mini-transcribe";

const SYSTEM_PROMPT = `You are SurakshaSetu AI — a calm, warm digital banking safety companion for first-time Indian digital users.
You help users identify UPI scams, phishing, fake loan apps, KYC fraud, QR fraud, and cyber threats.
Reply in the same language the user uses (English, Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi).
Be concise. Use short sentences. When you spot a scam, be clear and firm: "This looks like a scam. Do NOT pay/share OTP."
Always end high-risk answers with 1-3 concrete next steps (freeze card, call 1930, report on cybercrime.gov.in).
Never ask users to share OTPs, passwords, PINs, or CVVs.`;

const ANALYSIS_INSTRUCTION = `Analyze the provided content (message text, image OCR, or voice transcript) for Indian banking / UPI / phishing / KYC / loan-app / QR scam risk.

If input is an image, first perform OCR mentally and use that text.
Extract EVERY suspicious URL, phone number, and UPI VPA (looks like name@bank) you can find.

Return STRICT JSON only. No markdown, no code fences. Schema:
{
  "riskScore": number 0-100,
  "confidence": number 0-100,
  "riskLevel": "safe" | "caution" | "high",
  "detectedScamType": string,
  "extractedText": string (OCR/transcript verbatim, or "" if plain text was given),
  "detectedLinks": string[],
  "detectedPhoneNumbers": string[],
  "detectedUPI": string[],
  "suspiciousPhrases": string[] (max 6, verbatim snippets that triggered flags),
  "redFlags": string[] (max 6, short human explanations),
  "summary": string (2-3 short sentences, plain language),
  "recommendation": string (one clear next-step sentence),
  "recommendedActions": string[] (max 4, concrete steps)
}`;

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });

type Analysis = {
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

async function callChat(body: unknown): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached. Please try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in the workspace.");
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseAnalysis(raw: string): Analysis {
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
  const fallback: Analysis = {
    riskScore: 50, confidence: 40, riskLevel: "caution",
    detectedScamType: "Unknown", extractedText: "",
    detectedLinks: [], detectedPhoneNumbers: [], detectedUPI: [],
    suspiciousPhrases: [], redFlags: [],
    summary: cleaned.slice(0, 400),
    recommendation: "If unsure, do not pay or share credentials. Call 1930.",
    recommendedActions: ["Do not share OTPs, PINs or passwords.", "Report on cybercrime.gov.in if you have paid."],
  };
  try {
    const p = JSON.parse(cleaned);
    return {
      riskScore: Math.max(0, Math.min(100, Number(p.riskScore ?? p.risk_score ?? 50))),
      confidence: Math.max(0, Math.min(100, Number(p.confidence ?? 60))),
      riskLevel: (["safe", "caution", "high"].includes(p.riskLevel) ? p.riskLevel : p.risk_level) ?? "caution",
      detectedScamType: String(p.detectedScamType ?? p.scam_type ?? "Unknown"),
      extractedText: String(p.extractedText ?? ""),
      detectedLinks: Array.isArray(p.detectedLinks) ? p.detectedLinks.map(String) : [],
      detectedPhoneNumbers: Array.isArray(p.detectedPhoneNumbers) ? p.detectedPhoneNumbers.map(String) : [],
      detectedUPI: Array.isArray(p.detectedUPI) ? p.detectedUPI.map(String) : [],
      suspiciousPhrases: Array.isArray(p.suspiciousPhrases) ? p.suspiciousPhrases.map(String) : [],
      redFlags: Array.isArray(p.redFlags) ? p.redFlags.map(String) : (Array.isArray(p.red_flags) ? p.red_flags.map(String) : []),
      summary: String(p.summary ?? p.explanation ?? ""),
      recommendation: String(p.recommendation ?? ""),
      recommendedActions: Array.isArray(p.recommendedActions) ? p.recommendedActions.map(String) : (Array.isArray(p.recommended_actions) ? p.recommended_actions.map(String) : []),
    };
  } catch {
    return fallback;
  }
}

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ messages: z.array(Msg).min(1).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const content = await callChat({
      model: MODEL_CHAT,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      temperature: 0.4,
    });
    return { reply: content };
  });

export const analyzeScam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    text: z.string().max(6000).optional(),
    imageDataUrl: z.string().max(8_000_000).optional(),
  }).refine((v) => v.text || v.imageDataUrl, "Provide text or image").parse(d))
  .handler(async ({ data }): Promise<Analysis> => {
    const userContent: Array<Record<string, unknown>> = [{ type: "text", text: ANALYSIS_INSTRUCTION }];
    if (data.text) userContent.push({ type: "text", text: `Content to analyze:\n${data.text}` });
    if (data.imageDataUrl) userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });

    const raw = await callChat({
      model: MODEL_CHAT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked to analyze, reply with strict JSON only." },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
    });
    return parseAnalysis(raw);
  });

export const analyzeAudio = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    audioDataUrl: z.string().min(20).max(20_000_000),
    mimeType: z.string().max(120).optional(),
    language: z.string().max(8).optional(),
  }).parse(d))
  .handler(async ({ data }): Promise<Analysis & { transcript: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Decode data URL -> Blob
    const m = /^data:([^;]+);base64,(.+)$/.exec(data.audioDataUrl);
    if (!m) throw new Error("Invalid audio payload");
    const mime = data.mimeType || m[1] || "audio/webm";
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const extMap: Record<string, string> = {
      "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3", "audio/mp3": "mp3",
      "audio/wav": "wav", "audio/x-wav": "wav", "audio/wave": "wav",
      "audio/aac": "aac", "audio/m4a": "m4a", "audio/x-m4a": "m4a", "audio/ogg": "ogg",
    };
    const ext = extMap[mime.split(";")[0]] ?? "webm";

    const form = new FormData();
    form.append("model", MODEL_STT);
    form.append("file", new Blob([bytes], { type: mime }), `recording.${ext}`);
    if (data.language) form.append("language", data.language);

    const sttRes = await fetch(GATEWAY_STT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!sttRes.ok) {
      const text = await sttRes.text().catch(() => "");
      if (sttRes.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (sttRes.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Transcription failed ${sttRes.status}: ${text.slice(0, 200)}`);
    }
    const sttJson = await sttRes.json();
    const transcript: string = String(sttJson.text ?? "").trim();
    if (!transcript) {
      return {
        transcript: "",
        riskScore: 0, confidence: 0, riskLevel: "safe",
        detectedScamType: "No speech detected", extractedText: "",
        detectedLinks: [], detectedPhoneNumbers: [], detectedUPI: [],
        suspiciousPhrases: [], redFlags: [],
        summary: "No speech was detected in the recording. Try again in a quieter place.",
        recommendation: "Re-record clearly and closer to the mic.",
        recommendedActions: ["Re-record the call in a quieter place."],
      };
    }

    const raw = await callChat({
      model: MODEL_CHAT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked to analyze, reply with strict JSON only." },
        { role: "user", content: [
          { type: "text", text: ANALYSIS_INSTRUCTION },
          { type: "text", text: `Voice call transcript to analyze:\n${transcript}` },
        ]},
      ],
      temperature: 0.2,
    });
    const analysis = parseAnalysis(raw);
    return { ...analysis, transcript, extractedText: analysis.extractedText || transcript };
  });

// ============================================================
// Chat Analyzer (WhatsApp / SMS / Telegram / Messenger)
// ============================================================

const CHAT_CATEGORIES = [
  "Scam", "Emotional Manipulation", "Fake Job", "Lottery",
  "Crypto Investment", "Loan Scam", "Phishing", "Romance Scam", "Impersonation", "Safe",
] as const;

const LEARNING_TOPICS = [
  "upi-safety", "loan-app-safety", "phishing-basics",
  "kyc-fraud", "qr-fraud", "cyber-crime-reporting",
] as const;

const CHAT_INSTRUCTION = `You are analyzing a chat conversation from ${"${platform}"} for scam patterns common in India.

Detect: Scam, Emotional Manipulation, Fake Job, Lottery, Crypto Investment, Loan Scam,
Phishing, Romance Scam, Impersonation. Extract every URL, phone number, and UPI VPA.

Return STRICT JSON only. No markdown, no code fences. Schema:
{
  "riskScore": number 0-100,
  "confidence": number 0-100,
  "riskLevel": "safe" | "caution" | "high",
  "detectedScamType": string (one of: Scam, Emotional Manipulation, Fake Job, Lottery, Crypto Investment, Loan Scam, Phishing, Romance Scam, Impersonation, Safe),
  "category": string (same as detectedScamType),
  "platform": string (WhatsApp | SMS | Telegram | Messenger | Other),
  "extractedText": "",
  "detectedLinks": string[],
  "detectedPhoneNumbers": string[],
  "detectedUPI": string[],
  "suspiciousPhrases": string[] (max 6, verbatim snippets),
  "redFlags": string[] (max 6),
  "reason": string (2-3 sentences explaining WHY this is or isn't a scam),
  "summary": string (same as reason),
  "recommendation": string,
  "recommendedActions": string[] (max 4),
  "relatedLearning": { "slug": string (one of: upi-safety, loan-app-safety, phishing-basics, kyc-fraud, qr-fraud, cyber-crime-reporting), "title": string }
}`;

export const analyzeChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    conversation: z.string().min(1).max(8000),
    platform: z.enum(["WhatsApp", "SMS", "Telegram", "Messenger", "Other"]).default("WhatsApp"),
  }).parse(d))
  .handler(async ({ data }) => {
    const instruction = CHAT_INSTRUCTION.replace("${platform}", data.platform);
    const raw = await callChat({
      model: MODEL_CHAT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked to analyze, reply with strict JSON only." },
        { role: "user", content: [
          { type: "text", text: instruction },
          { type: "text", text: `Platform: ${data.platform}\nConversation:\n${data.conversation}` },
        ]},
      ],
      temperature: 0.2,
    });
    const base = parseAnalysis(raw);
    let extra: { category: string; platform: string; reason: string; relatedLearning: { slug: string; title: string } | null } = {
      category: base.detectedScamType, platform: data.platform, reason: base.summary, relatedLearning: null,
    };
    try {
      const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
      const p = JSON.parse(cleaned);
      const cat = CHAT_CATEGORIES.find((c) => c.toLowerCase() === String(p.category ?? p.detectedScamType ?? "").toLowerCase()) ?? base.detectedScamType;
      const rl = p.relatedLearning;
      const slug = rl && LEARNING_TOPICS.includes(String(rl.slug) as typeof LEARNING_TOPICS[number]) ? String(rl.slug) : null;
      extra = {
        category: String(cat),
        platform: String(p.platform ?? data.platform),
        reason: String(p.reason ?? base.summary),
        relatedLearning: slug ? { slug, title: String(rl.title ?? slug) } : null,
      };
    } catch { /* fallback already set */ }
    return { ...base, ...extra };
  });

// ============================================================
// Email Analyzer
// ============================================================

const EMAIL_INSTRUCTION = `Analyze this email for phishing / spoofing / fraud targeting Indian banking users.

Detect: spoofed sender domain, display-name mismatch, reply-to mismatch, suspicious attachments,
tracking pixels, deceptive links (visible text vs actual URL), urgency & threats, credential harvesting.

Return STRICT JSON only. No markdown, no code fences. Schema:
{
  "riskScore": number 0-100,
  "confidence": number 0-100,
  "riskLevel": "safe" | "caution" | "high",
  "detectedScamType": string (e.g. "Phishing", "Spoofed Sender", "Safe"),
  "extractedText": "",
  "detectedLinks": string[],
  "detectedPhoneNumbers": string[],
  "detectedUPI": string[],
  "suspiciousPhrases": string[] (max 6),
  "redFlags": string[] (max 6),
  "summary": string (2-3 sentences),
  "recommendation": string,
  "recommendedActions": string[] (max 4),
  "senderDomain": string (domain of From:, or ""),
  "replyToDomain": string (domain of Reply-To:, or ""),
  "domainMismatch": boolean (true if From vs Reply-To domains differ meaningfully),
  "domainTrust": "trusted" | "unknown" | "suspicious" | "spoofed",
  "senderReputation": "good" | "unknown" | "poor",
  "suspiciousAttachments": string[],
  "trackingPixels": boolean
}`;

export const analyzeEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    sender: z.string().max(300).optional(),
    replyTo: z.string().max(300).optional(),
    subject: z.string().max(500).optional(),
    body: z.string().min(1).max(20000),
    rawHeaders: z.string().max(6000).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const composed = [
      data.sender ? `From: ${data.sender}` : "",
      data.replyTo ? `Reply-To: ${data.replyTo}` : "",
      data.subject ? `Subject: ${data.subject}` : "",
      data.rawHeaders ? `Headers:\n${data.rawHeaders}` : "",
      `Body:\n${data.body}`,
    ].filter(Boolean).join("\n");

    const raw = await callChat({
      model: MODEL_CHAT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked to analyze, reply with strict JSON only." },
        { role: "user", content: [
          { type: "text", text: EMAIL_INSTRUCTION },
          { type: "text", text: `Email to analyze:\n${composed}` },
        ]},
      ],
      temperature: 0.2,
    });
    const base = parseAnalysis(raw);
    let extra = {
      senderDomain: "", replyToDomain: "", domainMismatch: false,
      domainTrust: "unknown" as "trusted" | "unknown" | "suspicious" | "spoofed",
      senderReputation: "unknown" as "good" | "unknown" | "poor",
      suspiciousAttachments: [] as string[], trackingPixels: false,
    };
    try {
      const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
      const p = JSON.parse(cleaned);
      extra = {
        senderDomain: String(p.senderDomain ?? ""),
        replyToDomain: String(p.replyToDomain ?? ""),
        domainMismatch: Boolean(p.domainMismatch),
        domainTrust: (["trusted","unknown","suspicious","spoofed"].includes(p.domainTrust) ? p.domainTrust : "unknown"),
        senderReputation: (["good","unknown","poor"].includes(p.senderReputation) ? p.senderReputation : "unknown"),
        suspiciousAttachments: Array.isArray(p.suspiciousAttachments) ? p.suspiciousAttachments.map(String) : [],
        trackingPixels: Boolean(p.trackingPixels),
      };
    } catch { /* keep defaults */ }
    return { ...base, ...extra };
  });

// ============================================================
// URL Analyzer
// ============================================================

const KNOWN_BRANDS = [
  "google.com","gmail.com","paytm.com","phonepe.com","gpay.google.com","pay.google.com",
  "sbi.co.in","onlinesbi.sbi","hdfcbank.com","icicibank.com","axisbank.com","kotak.com",
  "yesbank.in","pnbindia.in","bankofbaroda.in","unionbankofindia.co.in","canarabank.com",
  "npci.org.in","upi.npci.org.in","rbi.org.in","incometax.gov.in","cybercrime.gov.in",
  "amazon.in","flipkart.com","irctc.co.in","zomato.com","swiggy.com","myntra.com",
  "microsoft.com","apple.com","facebook.com","whatsapp.com","instagram.com",
];

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j-1], dp[i-1][j], dp[i][j-1]);
  }
  return dp[m][n];
}

function normalizeUrl(input: string): { url: URL; hostname: string; registrable: string } {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = "http://" + raw;
  const url = new URL(raw);
  const hostname = url.hostname.toLowerCase();
  const parts = hostname.split(".");
  const registrable = parts.length >= 2 ? parts.slice(-2).join(".") : hostname;
  return { url, hostname, registrable };
}

async function checkSSL(hostname: string): Promise<{ hasSSL: boolean; error?: string }> {
  try {
    const res = await fetch(`https://${hostname}/`, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(6000) });
    return { hasSSL: res.status > 0 };
  } catch (e) {
    return { hasSSL: false, error: e instanceof Error ? e.message : "SSL check failed" };
  }
}

async function whoisLookup(registrable: string): Promise<{ found: boolean; registrar?: string; created?: string; ageDays?: number; expires?: string }> {
  try {
    const res = await fetch(`https://rdap.org/domain/${registrable}`, { headers: { Accept: "application/rdap+json" }, signal: AbortSignal.timeout(7000) });
    if (!res.ok) return { found: false };
    const data = await res.json();
    let created: string | undefined, expires: string | undefined;
    for (const e of data.events ?? []) {
      if (e.eventAction === "registration") created = e.eventDate;
      if (e.eventAction === "expiration") expires = e.eventDate;
    }
    const registrar = (data.entities ?? []).find((x: { roles?: string[] }) => (x.roles ?? []).includes("registrar"))?.vcardArray?.[1]?.find((r: unknown[]) => r[0] === "fn")?.[3];
    const ageDays = created ? Math.floor((Date.now() - new Date(created).getTime()) / 86400000) : undefined;
    return { found: true, registrar: registrar ? String(registrar) : undefined, created, ageDays, expires };
  } catch {
    return { found: false };
  }
}

function typosquatCheck(registrable: string): { isTyposquat: boolean; nearestBrand?: string; distance?: number } {
  if (KNOWN_BRANDS.includes(registrable)) return { isTyposquat: false };
  let best = { brand: "", dist: Infinity };
  for (const brand of KNOWN_BRANDS) {
    const d = levenshtein(registrable, brand);
    if (d < best.dist) best = { brand, dist: d };
  }
  const isTyposquat = best.dist > 0 && best.dist <= 2 && best.brand.length >= 6;
  return { isTyposquat, nearestBrand: best.brand, distance: best.dist };
}

export const analyzeUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ url: z.string().min(3).max(2048) }).parse(d))
  .handler(async ({ data }) => {
    let normalized: { url: URL; hostname: string; registrable: string };
    try { normalized = normalizeUrl(data.url); }
    catch { throw new Error("Invalid URL. Include the full address, e.g. https://example.com"); }
    const { url, hostname, registrable } = normalized;

    const [ssl, whois] = await Promise.all([checkSSL(hostname), whoisLookup(registrable)]);
    const typo = typosquatCheck(registrable);

    const signals = {
      inputUrl: url.toString(),
      hostname, registrable,
      scheme: url.protocol.replace(":", ""),
      hasSSL: ssl.hasSSL,
      sslError: ssl.error ?? null,
      whoisFound: whois.found,
      registrar: whois.registrar ?? null,
      domainCreated: whois.created ?? null,
      domainAgeDays: whois.ageDays ?? null,
      domainExpires: whois.expires ?? null,
      typosquatSuspected: typo.isTyposquat,
      nearestKnownBrand: typo.nearestBrand ?? null,
      typosquatDistance: typo.distance ?? null,
      hasIPHost: /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname),
      hasSuspiciousTld: /\.(zip|mov|top|xyz|click|country|link|work|gq|tk|ml|cf)$/i.test(hostname),
      pathLength: url.pathname.length,
      hasAt: url.href.includes("@"),
      manyHyphens: (registrable.match(/-/g) ?? []).length >= 3,
      // External blacklist checks (Google Safe Browsing / VirusTotal) require API keys
      // and are not enabled; the LLM synthesizes trust from the signals above.
      googleSafeBrowsing: "not_configured",
      virusTotal: "not_configured",
    };

    const instruction = `You are analyzing a URL for phishing / fraud risk targeting Indian banking users.
Use the collected signals to synthesize a trust score. Weigh heavily: typosquatting of known banking/UPI brands,
missing HTTPS, IP-address hostnames, very new domains (< 90 days), suspicious TLDs, presence of "@" in URL.

Return STRICT JSON only. No markdown. Schema:
{
  "riskScore": number 0-100,
  "trustScore": number 0-100 (100 = fully trusted),
  "confidence": number 0-100,
  "riskLevel": "safe" | "caution" | "high",
  "detectedScamType": string (e.g. "Phishing", "Typosquat", "Safe"),
  "extractedText": "",
  "detectedLinks": string[] (the URL itself),
  "detectedPhoneNumbers": [],
  "detectedUPI": [],
  "suspiciousPhrases": [],
  "redFlags": string[] (max 6, short human explanations),
  "summary": string (2-3 sentences),
  "recommendation": string (one sentence),
  "recommendedActions": string[] (max 4)
}`;

    const raw = await callChat({
      model: MODEL_CHAT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked to analyze, reply with strict JSON only." },
        { role: "user", content: [
          { type: "text", text: instruction },
          { type: "text", text: `Signals:\n${JSON.stringify(signals, null, 2)}` },
        ]},
      ],
      temperature: 0.2,
    });
    const base = parseAnalysis(raw);
    let trustScore = 100 - base.riskScore;
    try {
      const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
      const p = JSON.parse(cleaned);
      if (typeof p.trustScore === "number") trustScore = Math.max(0, Math.min(100, p.trustScore));
    } catch { /* keep computed */ }

    const screenshotUrl = `https://image.thum.io/get/width/800/crop/500/${url.toString()}`;

    return {
      ...base,
      trustScore,
      hostname, registrable,
      scheme: signals.scheme,
      hasSSL: signals.hasSSL,
      registrar: signals.registrar,
      domainCreated: signals.domainCreated,
      domainAgeDays: signals.domainAgeDays,
      domainExpires: signals.domainExpires,
      typosquatSuspected: signals.typosquatSuspected,
      nearestKnownBrand: signals.nearestKnownBrand,
      hasIPHost: signals.hasIPHost,
      hasSuspiciousTld: signals.hasSuspiciousTld,
      googleSafeBrowsing: signals.googleSafeBrowsing,
      virusTotal: signals.virusTotal,
      screenshotUrl,
      analyzedUrl: url.toString(),
    };
  });

// ============================================================
// QR Analyzer
// ============================================================

function classifyQR(content: string): {
  type: "upi" | "url" | "phone" | "sms" | "wifi" | "vcard" | "text";
  intent: "collect_request" | "payment_request" | "website" | "phone" | "text" | "wifi" | "contact";
  upi?: { vpa: string; name?: string; amount?: string; note?: string; ref?: string };
  url?: string;
  phone?: string;
} {
  const t = content.trim();
  const lower = t.toLowerCase();
  if (lower.startsWith("upi://")) {
    try {
      const u = new URL(t);
      const p = u.searchParams;
      const vpa = p.get("pa") ?? "";
      const isCollect = /upi:\/\/(pay|collect|mandate)/i.test(t) && (p.get("mode") === "01" || /collect/i.test(u.hostname));
      return {
        type: "upi",
        intent: /collect|mandate/i.test(u.hostname) || isCollect ? "collect_request" : "payment_request",
        upi: { vpa, name: p.get("pn") ?? undefined, amount: p.get("am") ?? undefined, note: p.get("tn") ?? undefined, ref: p.get("tr") ?? undefined },
      };
    } catch { /* fall through */ }
  }
  if (/^https?:\/\//i.test(t)) return { type: "url", intent: "website", url: t };
  if (lower.startsWith("tel:")) return { type: "phone", intent: "phone", phone: t.slice(4) };
  if (lower.startsWith("smsto:") || lower.startsWith("sms:")) return { type: "sms", intent: "text" };
  if (lower.startsWith("wifi:")) return { type: "wifi", intent: "wifi" };
  if (lower.startsWith("begin:vcard")) return { type: "vcard", intent: "contact" };
  if (/^[\w.\-+]+@[\w.\-]+$/.test(t) && !t.includes(" ")) {
    return { type: "upi", intent: "payment_request", upi: { vpa: t } };
  }
  return { type: "text", intent: "text" };
}

const QR_INSTRUCTION = `You are analyzing a QR code payload for a first-time Indian digital banking user.
Explain in plain language what will happen if they scan/pay this QR. Warn strongly about "Collect / Request money" QRs (they PULL money from the user), unknown VPAs, mismatched merchant names, and payment URLs that aren't official bank / UPI apps.

Return STRICT JSON only. No markdown. Schema:
{
  "riskScore": number 0-100,
  "confidence": number 0-100,
  "riskLevel": "safe" | "caution" | "high",
  "detectedScamType": string (e.g. "Fake Collect Request", "Payment Request", "Phishing URL", "Safe Merchant QR"),
  "extractedText": string (the raw QR content),
  "detectedLinks": string[],
  "detectedPhoneNumbers": string[],
  "detectedUPI": string[],
  "suspiciousPhrases": string[],
  "redFlags": string[] (max 6),
  "summary": string (2-3 sentences, plain language),
  "recommendation": string,
  "recommendedActions": string[] (max 4),
  "explanation": string (what exactly happens if user scans this QR)
}`;

export const analyzeQR = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    content: z.string().min(1).max(4000),
  }).parse(d))
  .handler(async ({ data }) => {
    const meta = classifyQR(data.content);

    const raw = await callChat({
      model: MODEL_CHAT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked to analyze, reply with strict JSON only." },
        { role: "user", content: [
          { type: "text", text: QR_INSTRUCTION },
          { type: "text", text: `QR payload:\n${data.content}\n\nParsed metadata:\n${JSON.stringify(meta, null, 2)}` },
        ]},
      ],
      temperature: 0.2,
    });
    const base = parseAnalysis(raw);
    let explanation = base.summary;
    try {
      const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
      const p = JSON.parse(cleaned);
      if (typeof p.explanation === "string") explanation = p.explanation;
    } catch { /* keep default */ }

    return {
      ...base,
      extractedText: base.extractedText || data.content,
      qrType: meta.type,
      qrIntent: meta.intent,
      upi: meta.upi ?? null,
      url: meta.url ?? null,
      phone: meta.phone ?? null,
      explanation,
      rawContent: data.content,
    };
  });

// ============================================================
// RAG Knowledge Engine
// Curated snippets from RBI / NPCI / CERT-IN / cybercrime.gov.in
// Simple lexical retrieval + LLM synthesis (no external vector DB)
// ============================================================

type KBDoc = {
  id: string;
  source: string;
  title: string;
  url: string;
  text: string;
};

const KB: KBDoc[] = [
  { id: "rbi-upi-safety", source: "RBI", title: "Do's and Don'ts for UPI users",
    url: "https://www.rbi.org.in/CommonPerson/English/Scripts/FAQs.aspx?Id=3020",
    text: "You never need to enter your UPI PIN to RECEIVE money. Entering the PIN always DEBITS your account. Ignore 'collect requests' from unknown VPAs. Never share OTP, UPI PIN or card CVV with anyone claiming to be from a bank. RBI never calls customers asking for KYC over phone." },
  { id: "npci-collect-request", source: "NPCI",
    title: "Collect Request vs Payment", url: "https://www.npci.org.in/what-we-do/upi/faqs",
    text: "A UPI 'Collect Request' is a request for the payer to send money to the requester. Approving it debits YOUR account. Fraudsters send fake collect requests disguised as refunds, prize money, or KYC verification. Reject any collect request you did not initiate." },
  { id: "cert-in-phishing", source: "CERT-In",
    title: "Advisory on phishing SMS and links", url: "https://www.cert-in.org.in/",
    text: "Do not click links in unsolicited SMS or WhatsApp claiming account block, KYC expiry, courier delivery failure, or income-tax refund. Verify by opening the official app directly. Look for HTTPS and the exact domain (e.g. onlinesbi.sbi, not sbi-online.co.in)." },
  { id: "cert-in-fake-apps", source: "CERT-In",
    title: "Fake loan and lending apps", url: "https://www.cert-in.org.in/",
    text: "Only use loan apps from RBI-registered NBFCs. Fake apps demand access to Contacts, Photos and SMS to blackmail borrowers. Check the developer name and the RBI list before installing." },
  { id: "cybercrime-1930", source: "cybercrime.gov.in",
    title: "Report cyber financial fraud within 24 hours", url: "https://cybercrime.gov.in/",
    text: "Call helpline 1930 immediately if money has been debited fraudulently. Report at cybercrime.gov.in with transaction ID, screenshots, sender number and beneficiary VPA. The 'golden hour' (first 60 minutes) has the highest recovery chance." },
  { id: "rbi-kyc-fraud", source: "RBI",
    title: "KYC re-verification scams", url: "https://www.rbi.org.in/",
    text: "Banks do NOT ask you to complete KYC via WhatsApp, SMS link, or by installing screen-sharing apps (AnyDesk, TeamViewer, QuickSupport). Any such request is a scam. Visit the branch or use the official app for KYC updates." },
  { id: "npci-upi-lite", source: "NPCI",
    title: "UPI Lite and AutoPay", url: "https://www.npci.org.in/",
    text: "UPI Lite lets you make small-value payments without entering PIN each time, up to a per-wallet limit set by NPCI. AutoPay mandates need one-time PIN approval and can be paused or cancelled anytime from the UPI app." },
  { id: "cert-in-qr-fraud", source: "CERT-In",
    title: "QR code payment fraud", url: "https://www.cert-in.org.in/",
    text: "Scanning a QR NEVER credits money to you. Every UPI QR is for PAYING someone. Fraudsters send QR codes claiming 'scan to receive refund' — scanning and entering PIN will debit your account. If someone is 'sending you money', they do not need any QR or PIN from you." },
  { id: "rbi-freeze-card", source: "RBI",
    title: "Block a lost or misused card", url: "https://www.rbi.org.in/",
    text: "Immediately call the bank's 24x7 helpline or use the app's 'Block card' feature. Under RBI limited-liability rules, if you report unauthorized transactions within 3 working days, your liability is zero." },
  { id: "cert-in-otp", source: "CERT-In",
    title: "OTP and PIN protection", url: "https://www.cert-in.org.in/",
    text: "An OTP is proof YOU authorized a transaction. Sharing an OTP is equivalent to handing over cash. No genuine bank, delivery agent, or government officer will ever ask for your OTP." },
];

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, " ").split(/\s+/).filter((t) => t.length >= 3);
}

function scoreDoc(qTokens: string[], doc: KBDoc): number {
  const hay = tokenize(doc.title + " " + doc.text + " " + doc.source);
  const set = new Set(hay);
  let score = 0;
  for (const t of qTokens) {
    if (set.has(t)) score += 2;
    else if (hay.some((h) => h.includes(t) || t.includes(h))) score += 1;
  }
  // small boost for source diversity handled by caller
  return score;
}

const RAG_INSTRUCTION = `Answer the user's question about Indian banking safety using ONLY the retrieved sources below.
If the sources do not cover the question, say so and give general safety advice — do not invent regulations.
Cite sources inline as [S1], [S2], etc. matching the numbered snippets.

Return STRICT JSON only. No markdown, no code fences. Schema:
{
  "answer": string (2-5 short paragraphs, plain language, cite [S#]),
  "confidence": number 0-100,
  "usedSourceIds": string[] (subset of provided source IDs actually used),
  "relatedArticles": string[] (max 3, short titles the user should read next)
}`;

export const askKnowledge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    question: z.string().min(3).max(1000),
  }).parse(d))
  .handler(async ({ data }) => {
    const qTokens = tokenize(data.question);
    const ranked = KB
      .map((doc) => ({ doc, score: scoreDoc(qTokens, doc) }))
      .sort((a, b) => b.score - a.score);
    const top = (ranked[0]?.score ?? 0) > 0 ? ranked.filter((r) => r.score > 0).slice(0, 4) : ranked.slice(0, 3);

    const contextBlock = top.map((r, i) =>
      `[S${i + 1}] id=${r.doc.id} source=${r.doc.source}\nTitle: ${r.doc.title}\nURL: ${r.doc.url}\n${r.doc.text}`
    ).join("\n\n");

    const raw = await callChat({
      model: MODEL_CHAT,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked, reply with strict JSON only." },
        { role: "user", content: [
          { type: "text", text: RAG_INSTRUCTION },
          { type: "text", text: `Question:\n${data.question}\n\nRetrieved sources:\n${contextBlock}` },
        ]},
      ],
      temperature: 0.3,
    });

    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
    let answer = cleaned.slice(0, 2000);
    let confidence = 60;
    let usedIds: string[] = [];
    let related: string[] = [];
    try {
      const p = JSON.parse(cleaned);
      if (typeof p.answer === "string") answer = p.answer;
      if (typeof p.confidence === "number") confidence = Math.max(0, Math.min(100, p.confidence));
      if (Array.isArray(p.usedSourceIds)) usedIds = p.usedSourceIds.map(String);
      if (Array.isArray(p.relatedArticles)) related = p.relatedArticles.map(String).slice(0, 3);
    } catch { /* keep fallback */ }

    const sources = top.map((r, i) => ({
      tag: `S${i + 1}`,
      id: r.doc.id,
      source: r.doc.source,
      title: r.doc.title,
      url: r.doc.url,
      score: r.score,
      used: usedIds.length === 0 ? true : usedIds.includes(r.doc.id) || usedIds.includes(`S${i + 1}`),
    }));

    return { answer, confidence, sources, relatedArticles: related, question: data.question };
  });
