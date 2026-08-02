import { Globe } from "lucide-react";
import { LANGUAGES, useI18n, type LangCode } from "@/lib/i18n";

export function LanguageSwitcher({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { lang, setLang, t } = useI18n();
  return (
    <label
      className={`inline-flex items-center gap-2 text-xs ${tone === "dark" ? "text-white/80" : "text-muted-foreground"}`}
      style={{ fontFamily: "var(--font-multilingual)" }}
    >
      <Globe className="size-3.5" />
      <span className="sr-only">{t("app.language")}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as LangCode)}
        className={`bg-transparent outline-none cursor-pointer rounded-md px-1 py-0.5 border ${
          tone === "dark" ? "border-white/20 text-white" : "border-border text-foreground"
        }`}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-foreground">
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
