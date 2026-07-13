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
