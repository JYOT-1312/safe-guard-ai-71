import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are SurakshaSetu AI — a calm, warm digital banking safety companion for first-time Indian digital users.
You help users identify UPI scams, phishing, fake loan apps, KYC fraud, QR fraud, and cyber threats.
Reply in the same language the user uses (English, Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, Punjabi).
Be concise. Use short sentences. When you spot a scam, be clear and firm: "This looks like a scam. Do NOT pay/share OTP."
Always end high-risk answers with 1-3 concrete next steps (freeze card, call 1930, report on cybercrime.gov.in).
Never ask users to share OTPs, passwords, PINs, or CVVs.`;

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });

async function callGateway(body: unknown): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY, {
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

export const chatWithAI = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ messages: z.array(Msg).min(1).max(30) }).parse(d))
  .handler(async ({ data }) => {
    const content = await callGateway({
      model: MODEL,
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
  .handler(async ({ data }) => {
    const userContent: Array<Record<string, unknown>> = [];
    const instruction = `Analyze this content for banking / UPI / phishing / loan scam risk.
Return STRICT JSON only with keys:
{
  "risk_score": number (0-100),
  "risk_level": "safe" | "caution" | "high",
  "scam_type": string,
  "explanation": string (2-3 short sentences, plain language),
  "red_flags": string[] (max 5, each short),
  "recommended_actions": string[] (max 4, each concrete)
}
No markdown, no code fences. JSON only.`;
    userContent.push({ type: "text", text: instruction });
    if (data.text) userContent.push({ type: "text", text: `Content to analyze:\n${data.text}` });
    if (data.imageDataUrl) userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });

    const raw = await callGateway({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT + "\nWhen asked to analyze, reply with strict JSON only." },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
    });

    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return parsed as {
        risk_score: number; risk_level: "safe" | "caution" | "high";
        scam_type: string; explanation: string;
        red_flags: string[]; recommended_actions: string[];
      };
    } catch {
      return {
        risk_score: 50, risk_level: "caution" as const,
        scam_type: "Unknown", explanation: raw.slice(0, 400),
        red_flags: [], recommended_actions: ["Do not share OTPs, PINs or passwords.", "If unsure, call 1930."],
      };
    }
  });
