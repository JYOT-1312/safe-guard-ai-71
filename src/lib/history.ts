import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AnalysisType = Database["public"]["Enums"]["analysis_type"];
export type AnalysisRow = Database["public"]["Tables"]["analyses"]["Row"];

export type SaveInput = {
  type: AnalysisType;
  title: string;
  summary?: string | null;
  risk?: number;
  confidence?: number;
  payload?: unknown;
};

/** Fire-and-forget insert of a single analysis for the current user. */
export async function saveAnalysis(input: SaveInput): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error } = await supabase.from("analyses").insert({
      user_id: user.id,
      type: input.type,
      title: input.title.slice(0, 200),
      summary: input.summary?.slice(0, 1000) ?? null,
      risk: clamp(input.risk ?? 0),
      confidence: clamp(input.confidence ?? 0),
      payload: (input.payload ?? {}) as never,
    });
    if (error) console.warn("[history] save failed", error.message);
  } catch (e) {
    console.warn("[history] save exception", e);
  }
}

function clamp(n: number) {
  const x = Math.round(Number.isFinite(n) ? n : 0);
  return Math.max(0, Math.min(100, x));
}
