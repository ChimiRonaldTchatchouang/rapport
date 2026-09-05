import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Carte statistique shadcn : label, valeur, icône et variation optionnelles.
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
    <Card className={cn("gap-2 py-4", highlight && "border-transparent bg-primary text-primary-foreground")}>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className={cn("text-sm", highlight ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {label}
          </span>
          {icon && (
            <span className={highlight ? "text-primary-foreground/70" : "text-muted-foreground"}>{icon}</span>
          )}
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <span className="text-2xl font-bold tracking-tight">{value}</span>
          {delta && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                highlight
                  ? "bg-white/15 text-primary-foreground"
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
          <p className={cn("mt-1 text-xs", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
