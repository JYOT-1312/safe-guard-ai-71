import { GoogleGenAI, type Content, type Part } from "@google/genai";

export const GEMINI_MODEL = " gemini-3.1-flash-lite";

/** Text or multimodal content block accepted by geminiChat. */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | Record<string, unknown>;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentBlock[];
};

/**
 * Single shared Gemini client (Unified Google Gen AI SDK).
 * Created lazily so the key is never read at module scope (server-only, per-request env).
 */
let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("Gemini API key missing. Set GEMINI_API_KEY on the server.");
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** Map raw SDK/provider failures to safe, meaningful user-facing messages. */
export function toFriendlyError(error: unknown): Error {
  console.error("[gemini]", error);
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (/api key missing/i.test(msg)) return new Error("Gemini API key missing.");
  if (lower.includes("api key not valid") || lower.includes("api_key_invalid") || lower.includes("leaked"))
    return new Error("Gemini authentication failed. The API key is invalid or has been revoked.");
  if (lower.includes("401") || lower.includes("unauthenticated") || lower.includes("access_token_type_unsupported"))
    return new Error("Gemini authentication failed.");
  if (lower.includes("permission") || lower.includes("403"))
    return new Error("Gemini authentication failed. This key lacks permission for the Gemini API.");
  if (lower.includes("quota") || lower.includes("429") || lower.includes("resource_exhausted"))
    return new Error("Gemini quota exceeded. Please try again later.");
  if (lower.includes("not found") || lower.includes("404") || lower.includes("unsupported model"))
    return new Error("Invalid model requested.");
  if (lower.includes("503") || lower.includes("unavailable") || lower.includes("overloaded"))
    return new Error("Gemini unavailable. Please retry in a moment.");
  if (lower.includes("timeout") || lower.includes("etimedout") || lower.includes("aborted") || lower.includes("fetch failed"))
    return new Error("Network timeout while contacting Gemini.");
  if (lower.includes("image")) return new Error("Invalid image. Please upload a clear PNG or JPG.");
  if (lower.includes("audio")) return new Error("Invalid audio. Please record again.");
  if (lower.includes("mime") || lower.includes("unsupported"))
    return new Error("Unsupported format.");
  return new Error("Internal AI error. Please try again.");
}

function dataUrlToPart(url: string): Part {
  const m = /^data:([^;]+);base64,(.+)$/.exec(url.trim());
  if (!m) throw new Error("Invalid image: expected a base64 data URL.");
  return { inlineData: { mimeType: m[1], data: m[2] } };
}

function blocksToParts(content: string | ContentBlock[]): Part[] {
  if (typeof content === "string") return [{ text: content }];
  const parts: Part[] = [];
  for (const block of content) {
    const b = block as { type?: string; text?: string; image_url?: { url?: string } };
    if (b.type === "text" && typeof b.text === "string") parts.push({ text: b.text });
    else if (b.type === "image_url" && b.image_url?.url) parts.push(dataUrlToPart(b.image_url.url));
  }
  return parts.length ? parts : [{ text: "" }];
}

/**
 * OpenAI-style chat wrapper on top of ai.models.generateContent.
 * System messages become systemInstruction; text + images become Parts.
 */
export async function geminiChat(opts: {
  messages: ChatMessage[];
  temperature?: number;
  model?: string;
}): Promise<string> {
  const ai = getClient();

  const systemText = opts.messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : blocksToParts(m.content).map((p) => p.text ?? "").join("\n")))
    .join("\n\n");

  const contents: Content[] = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: blocksToParts(m.content),
    }));

  try {
    const response = await ai.models.generateContent({
      model: opts.model ?? GEMINI_MODEL,
      contents,
      config: {
        ...(systemText ? { systemInstruction: systemText } : {}),
        temperature: opts.temperature ?? 0.4,
      },
    });
    return response.text ?? "";
  } catch (error) {
    console.error("FULL GEMINI ERROR:");
    console.error(error);

    throw error;
}
}

/** Native Gemini audio understanding used for transcription. */
export async function geminiTranscribe(opts: {
  base64: string;
  mimeType: string;
  language?: string;
  model?: string;
}): Promise<string> {
  const ai = getClient();
  const instruction = opts.language
    ? `Transcribe this audio verbatim in ${opts.language}. Return only the transcript text, no commentary.`
    : "Transcribe this audio verbatim in its original language. Return only the transcript text, no commentary.";

  try {
    const response = await ai.models.generateContent({
      model: opts.model ?? GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { text: instruction },
            { inlineData: { mimeType: opts.mimeType, data: opts.base64 } },
          ],
        },
      ],
      config: { temperature: 0 },
    });
    return (response.text ?? "").trim();
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Simple text generation helper. */
export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
  return geminiChat({
    messages: [
      ...(systemInstruction ? [{ role: "system" as const, content: systemInstruction }] : []),
      { role: "user" as const, content: prompt },
    ],
    temperature: 0.7,
  });
}

/** Streaming text generation. */
export async function generateStream(prompt: string, onChunk: (text: string) => void): Promise<void> {
  const ai = getClient();
  try {
    const stream = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    for await (const chunk of stream) {
      if (chunk.text) onChunk(chunk.text);
    }
  } catch (error) {
    throw toFriendlyError(error);
  }
}
