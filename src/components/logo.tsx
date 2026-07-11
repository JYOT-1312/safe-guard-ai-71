import { ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="size-9 bg-brand-accent rounded-xl flex items-center justify-center shadow-md shadow-brand-accent/20 group-hover:scale-105 transition-transform">
        <ShieldCheck className="size-5 text-white" strokeWidth={2.5} />
      </div>
      {!compact && (
        <span className="text-lg font-bold tracking-tight">
          SurakshaSetu <span className="text-brand-accent">AI</span>
        </span>
      )}
    </Link>
  );
}
