import { cn } from "@/lib/utils";

// Carte statistique façon dashboard : label, grande valeur, variation optionnelle.
export function StatCard({
  label,
  value,
  delta,
  hint,
  highlight = false,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "card relative overflow-hidden p-5",
        highlight && "border-transparent bg-brand-600 text-white shadow-lg"
      )}
    >
      {highlight && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full"
          style={{ background: "radial-gradient(closest-side, rgba(224,169,46,0.55), transparent)" }}
        />
      )}
      <div className="relative flex items-center justify-between">
        <span
          className={cn(
            "text-sm",
            highlight ? "text-white/80" : "muted"
          )}
        >
          {label}
        </span>
        {icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              highlight ? "bg-white/15" : "bg-brand-50 text-brand-600 dark:bg-white/5"
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="relative mt-2 flex items-end justify-between gap-2">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {delta && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              highlight
                ? "bg-white/15 text-white"
                : delta.positive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                  : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
            )}
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        )}
      </div>
      {hint && (
        <p className={cn("relative mt-1 text-xs", highlight ? "text-white/70" : "muted")}>
          {hint}
        </p>
      )}
    </div>
  );
}
