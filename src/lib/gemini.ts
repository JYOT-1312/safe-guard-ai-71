/**
 * Google Gemini AI client — SERVER ONLY.
 *
 * The API key is read from process.env.GEMINI_API_KEY *inside* each call, so it
 * is never evaluated at module scope and never inlined into a client bundle.
 * Never use a VITE_ prefixed key here: Vite inlines VITE_* into browser code.
 */
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

export const GEMINI_MODEL = "gemini-2.5-flash";

/** Generic, user-safe fallback message. */
export const AI_ERROR = "Unable to analyze. Please try again.";

function resolveApiKey(): string {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const key = env["GEMINI_API_KEY"] ?? env["GOOGLE_GENERATIVE_AI_API_KEY"];
  if (!key) {
    console.error("[gemini] GEMINI_API_KEY is not configured on the server");
    throw new Error("Gemini is not configured. Add a valid GEMINI_API_KEY.");
  }
  return key;
}

function client() {
  return new GoogleGenerativeAI(resolveApiKey());
}

/** Map provider failures to actionable messages, log the raw error server-side. */
export function toFriendlyError(e: unknown): Error {
  const raw = e instanceof Error ? e.message : String(e);
  console.error("[gemini] request failed:", raw);
  const s = raw.toLowerCase();

  if (s.includes("leaked")) return new Error("Invalid API key: this Gemini key was reported as leaked. Generate a new key and update GEMINI_API_KEY.");
  if (s.includes("401") || s.includes("unauthenticated") || s.includes("access_token_type_unsupported") || s.includes("api key not valid") || s.includes("api_key_invalid")) {
    return new Error("Invalid API key. Check GEMINI_API_KEY (it must be a Google AI Studio key starting with AIza, not an OAuth token).");
  }
  if (s.includes("permission") || s.includes("403")) return new Error("Gemini rejected this key (permission denied). Enable the Generative Language API for the key's project.");
  if (s.includes("429") || s.includes("quota") || s.includes("rate limit")) return new Error("API quota exceeded. Wait a moment and try again.");
  if (s.includes("400") || s.includes("invalid argument")) return new Error("Invalid request sent to Gemini.");
  if (s.includes("404") || s.includes("not found")) return new Error("Requested Gemini model is unavailable.");
  if (s.includes("503") || s.includes("overloaded") || s.includes("unavailable")) return new Error("Gemini is temporarily unavailable. Please retry.");
  if (s.includes("fetch") || s.includes("network") || s.includes("timeout") || s.includes("econn")) return new Error("Network error reaching Gemini. Please retry.");
  if (s.startsWith("gemini is not configured")) return e instanceof Error ? e : new Error(raw);
  return new Error(AI_ERROR);
}

/** OpenAI-style content block used across the analyzers. */
type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | Record<string, unknown>;

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string | ContentBlock[] };

function toParts(content: string | ContentBlock[]): Part[] {
  if (typeof content === "string") return [{ text: content }];
  const parts: Part[] = [];
  for (const block of content) {
    const b = block as { type?: string; text?: string; image_url?: { url?: string } };
    if (b.type === "text" && typeof b.text === "string") {
      parts.push({ text: b.text });
    } else if (b.type === "image_url" && typeof b.image_url?.url === "string") {
      const m = /^data:([^;]+);base64,(.+)$/.exec(b.image_url.url);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
      else parts.push({ text: `Image URL: ${b.image_url.url}` });
    }
  }
  return parts.length ? parts : [{ text: "" }];
}

/**
 * Chat / analysis completion. Accepts the same message shape the app already
 * used, so every existing prompt and JSON output contract is preserved.
 */
export async function geminiChat(opts: {
  messages: ChatMessage[];
  temperature?: number;
  model?: string;
}): Promise<string> {
  const systemInstruction = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n\n");

  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: toParts(m.content),
    }));

  if (contents.length === 0) contents.push({ role: "user", parts: [{ text: "" }] });

  try {
    const model = client().getGenerativeModel({
      model: opts.model ?? GEMINI_MODEL,
      ...(systemInstruction ? { systemInstruction } : {}),
    });
    const result = await model.generateContent({
      contents,
      generationConfig: { temperature: opts.temperature ?? 0.4 },
    });
    return result.response.text() ?? "";
  } catch (e) {
    throw toFriendlyError(e);
  }
}

/** Audio transcription via Gemini's native audio understanding. */
export async function geminiTranscribe(opts: {
  base64: string;
  mimeType: string;
  language?: string;
}): Promise<string> {
  try {
    const model = client().getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: opts.mimeType, data: opts.base64 } },
            {
              text:
                "Transcribe this audio verbatim. Keep the original language" +
                (opts.language ? ` (expected: ${opts.language})` : "") +
                ". Return only the transcript text, no commentary. If there is no speech, return an empty string.",
            },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    });
    return (result.response.text() ?? "").trim();
  } catch (e) {
    throw toFriendlyError(e);
  }
}
