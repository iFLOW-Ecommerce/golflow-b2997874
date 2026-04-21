import { Zap } from "lucide-react";

const STAGE_MULTIPLIER: Record<string, number> = {
  round_of_16: 2,
  quarterfinal: 3,
  semifinal: 4,
  third_place: 5,
  final: 5,
};

export const getStageMultiplier = (stage: string | null | undefined) =>
  stage ? STAGE_MULTIPLIER[stage] ?? 1 : 1;

export const MultiplierBadge = ({
  stage,
  className = "",
}: {
  stage: string | null | undefined;
  className?: string;
}) => {
  const mult = getStageMultiplier(stage);
  if (mult <= 1) return null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}
      title={`Multiplicador ×${mult}`}
    >
      <Zap className="h-3 w-3" fill="currentColor" />×{mult}
    </span>
  );
};
