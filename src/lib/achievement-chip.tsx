import { Trophy, Star } from "lucide-react";

type StageGroup = "group" | "knockout" | "tournament";

const STAGE_LABEL: Record<StageGroup, string> = {
  tournament: "Torneo",
  knockout: "Eliminatorias",
  group: "Fase de grupos",
};

export const stageGroupLabel = (sg: StageGroup) => STAGE_LABEL[sg];

export const AchievementChip = ({
  scope,
  stageGroup,
  position,
  teamName,
}: {
  scope: "global" | "team";
  stageGroup: StageGroup;
  position: number;
  teamName?: string | null;
}) => {
  const stage = STAGE_LABEL[stageGroup];
  const label =
    scope === "global"
      ? `${stage}: #${position} Ranking Global`
      : `${stage}: #${position} Ranking Equipo ${teamName ?? ""}`.trim();

  if (scope === "global") {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-400/40 px-2.5 py-1 text-xs font-semibold backdrop-blur"
        style={{ textShadow: "0 0 8px hsl(150 100% 60% / 0.4)" }}
        title={label}
      >
        <Trophy className="h-3 w-3" fill="currentColor" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-yellow-300/15 text-yellow-100 border border-yellow-300/40 px-2.5 py-1 text-xs font-semibold backdrop-blur"
      style={{ textShadow: "0 0 8px hsl(50 100% 60% / 0.4)" }}
      title={label}
    >
      <Star className="h-3 w-3" fill="currentColor" />
      <span>{label}</span>
    </span>
  );
};
