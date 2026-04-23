import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const TrendBadge = ({
  current,
  previous,
  className = "",
}: {
  current: number | null | undefined;
  previous: number | null | undefined;
  className?: string;
}) => {
  const baseClass =
    "inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";

  if (current == null || previous == null || current === previous) {
    return (
      <span
        className={cn(baseClass, "text-muted-foreground", className)}
        title="Sin cambios"
        aria-label="Sin cambios"
      >
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  if (current < previous) {
    const delta = previous - current;
    return (
      <span
        className={cn(baseClass, "text-emerald-500", className)}
        title={`Subió ${delta}`}
        aria-label={`Subió ${delta}`}
      >
        <TrendingUp className="h-3 w-3" />+{delta}
      </span>
    );
  }
  const delta = current - previous;
  return (
    <span
      className={cn(baseClass, "text-destructive", className)}
      title={`Bajó ${delta}`}
      aria-label={`Bajó ${delta}`}
    >
      <TrendingDown className="h-3 w-3" />-{delta}
    </span>
  );
};
