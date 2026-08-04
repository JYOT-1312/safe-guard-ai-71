import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { geminiChat, GEMINI_MODEL } from "@/lib/gemini";

const Body = z.object({
  text: z.string().min(1, "text is required").max(20000),
  language: z.string().max(40).optional(),
});

const INSTRUCTION = `Analyze the provided content for Indian banking / UPI / phishing / KYC / loan-app / QR scam risk.
Extract EVERY suspicious URL, phone number, and UPI VPA (name@bank).
Return STRICT JSON only, no markdown, no code fences. Schema:
{
  "riskScore": number 0-100,
  "confidence": number 0-100,
  "riskLevel": "safe" | "caution" | "high",
  "detectedScamType": string,
  "detectedLinks": string[],
  "detectedPhoneNumbers": string[],
  "detectedUPI": string[],
  "redFlags": string[],
  "summary": string,
  "recommendation": string,
  "recommendedActions": string[]
}`;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ error: "Invalid request: expected { text: string }" }, 400);
        }

        try {
          const raw = await geminiChat({
            model: GEMINI_MODEL,
            temperature: 0.2,
            messages: [
              { role: "system", content: INSTRUCTION },
              {
                role: "user",
                content: parsed.language
                  ? `Reply in ${parsed.language}.\n\n${parsed.text}`
                  : parsed.text,
              },
            ],
          });
          const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "").trim();
          try {
            return json({ ok: true, result: JSON.parse(cleaned) });
          } catch {
            return json({ ok: true, result: { summary: cleaned } });
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : "Internal server error";
          console.error("[api/analyze]", e);
          const status = /invalid api key|not configured|permission/i.test(message)
            ? 401
            : /quota/i.test(message)
              ? 429
              : /unavailable|network/i.test(message)
                ? 503
                : 500;
          return json({ ok: false, error: message }, status);
        }
      },
    },
  },
});
