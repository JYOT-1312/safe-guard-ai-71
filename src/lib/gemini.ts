import { GoogleGenAI } from "@google/genai";

// 1. Initialize the new unified Google Gen AI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

/**
 * Standard text generation using the new Google Gen AI SDK
 */
export async function generateText(prompt: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text ?? null;
  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw error;
  }
}

/**
 * Text generation with configuration (e.g., system instructions, temperature, response mime type)
 */
export async function generateTextWithConfig(
  prompt: string,
  systemInstruction?: string
): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text ?? null;
  } catch (error) {
    console.error("Error generating content with config:", error);
    throw error;
  }
}

/**
 * Streaming content response using generateContentStream
 */
export async function generateStream(
  prompt: string,
  onChunk: (text: string) => void
): Promise<void> {
  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        onChunk(chunk.text);
      }
    }
  } catch (error) {
    console.error("Error streaming content:", error);
    throw error;
  }
}
