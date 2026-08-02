import { useState } from "react";
import { X, PlayCircle, ShieldCheck } from "lucide-react";
import type { LessonTopic } from "@/lib/lesson-videos";
import { useI18n, type TKey } from "@/lib/i18n";

export function LessonVideoCard({ topic }: { topic: LessonTopic }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const { t } = useI18n();
  const title = t(`topic.${topic.slug}.title` as TKey);
  const blurb = t(`topic.${topic.slug}.blurb` as TKey);
  const video = topic.videos[active];

  return (
    <>
      <div className="p-6 rounded-2xl border border-border bg-background hover:border-brand-accent transition-colors flex flex-col">
        <ShieldCheck className="size-6 text-brand-accent mb-4" />
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {topic.videos.length} {t("learn.lessons")} · {t("learn.min")}
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed flex-1">{blurb}</p>
        <button
          type="button"
          onClick={() => { setActive(0); setOpen(true); }}
          className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <PlayCircle className="size-4" /> {t("learn.open")}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-brand-primary/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-4xl mx-auto bg-white rounded-3xl border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-brand-accent">
                  {title} · {t("learn.lesson")} {active + 1} / {topic.videos.length}
                </div>
                <h3 className="text-lg font-bold mt-1">{video.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("learn.source")}: {video.source}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("learn.close")}
                className="shrink-0 size-9 grid place-items-center rounded-full border border-border hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="aspect-video bg-brand-primary">
              <iframe
                key={video.id}
                className="size-full"
                src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
                title={video.title}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-5 grid sm:grid-cols-2 gap-2">
              {topic.videos.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                    i === active
                      ? "border-brand-accent bg-brand-accent/5"
                      : "border-border hover:border-brand-accent"
                  }`}
                >
                  <div className="font-semibold">{i + 1}. {v.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{v.source}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
