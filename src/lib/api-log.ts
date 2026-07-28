import { supabase } from "@/integrations/supabase/client";

export type ApiLogInput = {
  tool: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
  status?: "ok" | "error" | "rate_limited";
  error?: string;
};

/** Fire-and-forget insert of an AI Gateway call log for admin observability. */
export function logApi(input: ApiLogInput): void {
  void (async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("api_logs").insert({
        user_id: u.user.id,
        tool: input.tool,
        model: input.model ?? null,
        tokens_in: input.tokensIn ?? null,
        tokens_out: input.tokensOut ?? null,
        latency_ms: input.latencyMs ?? null,
        status: input.status ?? "ok",
        error: input.error?.slice(0, 500) ?? null,
      });
    } catch {
      // best-effort; observability must never break UX
    }
  })();
}

/** Convenience wrapper: times an async op and records success/failure. */
export async function withApiLog<T>(tool: string, fn: () => Promise<T>, meta?: { model?: string }): Promise<T> {
  const t0 = performance.now();
  try {
    const out = await fn();
    logApi({ tool, model: meta?.model, latencyMs: Math.round(performance.now() - t0), status: "ok" });
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const rateLimited = /rate limit/i.test(msg);
    logApi({
      tool,
      model: meta?.model,
      latencyMs: Math.round(performance.now() - t0),
      status: rateLimited ? "rate_limited" : "error",
      error: msg,
    });
    throw e;
  }
}
