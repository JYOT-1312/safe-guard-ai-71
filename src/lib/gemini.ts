/**
 * Google Gemini AI client.
 *
 * The API key is read only from environment variables (VITE_GEMINI_API_KEY),
 * never hardcoded. All calls in this file run inside server functions, so the
 * key stays on the server and is never shipped to the browser.
 */
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";

export const GEMINI_MODEL = "gemini-2.5-flash";

/** Generic, user-safe failure message (no provider details leaked). */
export const AI_ERROR = "Unable to analyze. Please try again.";

function resolveApiKey(): string {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  let viteKey: string | undefined;
  try {
    viteKey = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_GEMINI_API_KEY;
  } catch {
    viteKey = undefined;
  }
  const key = env.VITE_GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? viteKey;
  if (!key) throw new Error(AI_ERROR);
  return key;
}

function client() {
  return new GoogleGenerativeAI(resolveApiKey());
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
    console.error("[gemini] generateContent failed", e);
    throw new Error(AI_ERROR);
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
    console.error("[gemini] transcription failed", e);
    throw new Error(AI_ERROR);
  }
}
