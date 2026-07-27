import { useState } from "react";
import type { QuizModule } from "@/lib/quizzes";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, RotateCcw, Trophy, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function QuizCard({ module }: { module: QuizModule }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = module.questions[idx];

  async function saveAttempt(finalScore: number) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("quiz_attempts").insert({
      user_id: u.user.id,
      module_slug: module.slug,
      score: finalScore,
      total: module.questions.length,
    });
  }

  function next() {
    if (picked === null) return;
    const correct = picked === q.answer;
    const nextScore = score + (correct ? 1 : 0);
    if (idx + 1 >= module.questions.length) {
      setScore(nextScore);
      setDone(true);
      void saveAttempt(nextScore).then(() => {
        const pct = Math.round((nextScore / module.questions.length) * 100);
        if (pct === 100) toast.success(`Perfect score on ${module.title}!`);
        else if (pct >= 60) toast.success(`Nice — ${pct}% on ${module.title}`);
        else toast.message(`${pct}% — review and try again`);
      });
    } else {
      setScore(nextScore);
      setIdx(idx + 1);
      setPicked(null);
    }
  }

  function reset() { setIdx(0); setPicked(null); setScore(0); setDone(false); }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full mt-4 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-brand-accent/5 border border-brand-accent/30 hover:bg-brand-accent/10 transition-colors group">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-brand-accent">
          <Sparkles className="size-4" /> Take the quiz ({module.questions.length} Q)
        </span>
        <span className="text-brand-accent text-sm">Start →</span>
      </button>
    );
  }

  if (done) {
    const pct = Math.round((score / module.questions.length) * 100);
    const tone = pct === 100 ? "safety-green" : pct >= 60 ? "brand-accent" : "alert-amber";
    return (
      <div className={`mt-4 rounded-2xl p-5 bg-${tone}/5 border border-${tone}/30`}>
        <div className={`inline-flex items-center gap-2 text-${tone} font-bold`}>
          <Trophy className="size-5" /> {score} / {module.questions.length} · {pct}%
        </div>
        <p className="text-sm text-muted-foreground mt-1">Saved to your history.</p>
        <div className="mt-3 flex gap-2">
          <button onClick={reset} className="px-3 py-2 text-sm rounded-lg border border-border bg-white hover:bg-secondary inline-flex items-center gap-2">
            <RotateCcw className="size-4" /> Retry
          </button>
          <button onClick={() => { reset(); setOpen(false); }} className="px-3 py-2 text-sm rounded-lg bg-brand-accent text-white hover:opacity-90">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl p-5 bg-white border-2 border-brand-accent/20">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-accent">Question {idx + 1} / {module.questions.length}</div>
        <div className="text-xs text-muted-foreground">Score: {score}</div>
      </div>
      <div className="font-semibold mb-4">{q.q}</div>
      <div className="space-y-2">
        {q.choices.map((c, i) => {
          const isPicked = picked === i;
          const isCorrect = i === q.answer;
          const showState = picked !== null;
          const cls = showState
            ? isCorrect
              ? "border-safety-green bg-safety-green/10 text-safety-green"
              : isPicked
                ? "border-alert-red bg-alert-red/10 text-alert-red"
                : "border-border bg-white text-muted-foreground"
            : "border-border bg-white hover:border-brand-accent";
          return (
            <button
              key={i}
              disabled={picked !== null}
              onClick={() => setPicked(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-sm inline-flex items-center gap-3 ${cls}`}
            >
              <span className="size-6 rounded-full grid place-items-center text-xs font-bold shrink-0 bg-white border border-current">
                {showState && isCorrect ? <Check className="size-3" /> : showState && isPicked ? <X className="size-3" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{c}</span>
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-4 text-sm bg-secondary/50 rounded-xl p-3 border border-border">
          <span className="font-semibold">Why: </span>{q.explain}
        </div>
      )}
      <div className="mt-4 flex justify-end">
        <button onClick={next} disabled={picked === null}
          className="px-4 py-2 rounded-xl bg-brand-accent text-white font-semibold hover:opacity-90 disabled:opacity-40">
          {idx + 1 >= module.questions.length ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}
