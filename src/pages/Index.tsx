import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, BarChart3, CalendarClock, Sparkles, Building2, HelpCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { RulesDialog } from "@/components/RulesDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MultiplierBadge } from "@/lib/multiplier";
import { TeamName } from "@/lib/country-flag";
import { TrendBadge } from "@/lib/trend-badge";
import { UserAvatar } from "@/lib/user-avatar";
import { displayName, firstName } from "@/lib/display-name";
import { AchievementChip } from "@/lib/achievement-chip";
import { cn } from "@/lib/utils";
import heroStadium from "@/assets/hero-stadium.webp";

const LOCK_MS = 60 * 60 * 1000; // 1h antes del partido (igual a /prediccion)

const randomScore = (): number => {
  const r = Math.random();
  if (r < 0.35) return 0;
  if (r < 0.7) return 1;
  if (r < 0.9) return 2;
  return 3;
};

const formatCountdown = (msRemaining: number): { text: string; tone: "gray" | "orange" | "red" | "closed" } => {
  if (msRemaining <= 0) return { text: "Cerrado", tone: "closed" };
  const totalSec = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (msRemaining > 24 * 60 * 60 * 1000) return { text: `${days}d ${hours}h`, tone: "gray" };
  if (msRemaining > 4 * 60 * 60 * 1000) return { text: `${hours}h ${minutes}m`, tone: "orange" };
  return { text: `${hours}h ${minutes}m ${seconds}s`, tone: "red" };
};

const toneClass = (tone: "gray" | "orange" | "red" | "closed") => {
  switch (tone) {
    case "orange": return "text-orange-500";
    case "red": return "text-destructive";
    case "closed": return "text-muted-foreground line-through";
    default: return "text-muted-foreground";
  }
};

type StageGroup = "group" | "knockout" | "tournament";
type Achievement = {
  scope: "global" | "team";
  team_id: string | null;
  stage_group: StageGroup;
  position: number;
};

const STAGE_ORDER: Record<StageGroup, number> = { tournament: 0, knockout: 1, group: 2 };

const KNOCKOUT_STAGES = ["round_of_32", "round_of_16", "quarterfinal", "semifinal", "final"];

type MatchRow = {
  id: string;
  stage: string;
  home_team: string;
  away_team: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
};

type PredRow = {
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number;
};

const formatShortDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
};

const streakEmoji = (n: number) => {
  if (n <= 0) return "😴";
  if (n === 1) return "🌱";
  if (n === 2) return "😁";
  if (n === 3) return "😎";
  if (n === 4) return "🚀";
  if (n === 5) return "✨";
  if (n === 6) return "🔥";
  if (n === 7) return "🔥🔥";
  if (n === 8) return "🔥🔥🔥";
  if (n === 9) return "👑";
  if (n === 10) return "👑👑";
  return "👑👑👑";
};

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [now, setNow] = useState<number>(Date.now());
  const [autoPredicting, setAutoPredicting] = useState(false);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number>(0);
  const [myProfile, setMyProfile] = useState<{ first_name: string | null; last_name: string | null; email: string | null } | null>(null);
  const [globalTotal, setGlobalTotal] = useState<number>(0);
  const [myCurrentRank, setMyCurrentRank] = useState<number | null>(null);
  const [myPreviousRank, setMyPreviousRank] = useState<number | null>(null);
  const [myTeamName, setMyTeamName] = useState<string | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [myTeamPosition, setMyTeamPosition] = useState<number | null>(null);
  const [myTeamTotal, setMyTeamTotal] = useState<number>(0);
  const [myTeamCurrentRank, setMyTeamCurrentRank] = useState<number | null>(null);
  const [myTeamPreviousRank, setMyTeamPreviousRank] = useState<number | null>(null);
  const [rankingWindow, setRankingWindow] = useState<Array<{ position: number; user_id: string; email: string | null; first_name: string | null; last_name: string | null; avatar_seed: string | null; team_name: string | null; total_points: number; current_rank: number | null; previous_rank: number | null }>>([]);
  const [teamRankingWindow, setTeamRankingWindow] = useState<Array<{ position: number; user_id: string; email: string | null; first_name: string | null; last_name: string | null; avatar_seed: string | null; total_points: number; team_current_rank: number | null; team_previous_rank: number | null }>>([]);
  const [interAreasWindow, setInterAreasWindow] = useState<Array<{ position: number; team_avatar_id: string; team_id: string; name: string; total_points: number; current_rank: number | null; previous_rank: number | null }>>([]);
  const [rankView, setRankView] = useState<"global" | "team">("global");
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesAutoOpened, setRulesAutoOpened] = useState(false);
  const [upcoming, setUpcoming] = useState<MatchRow[]>([]);
  const [recent, setRecent] = useState<MatchRow[]>([]);
  const [predsByMatch, setPredsByMatch] = useState<Record<string, PredRow>>({});
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    document.title = "Inicio | Prode Mundial 2026";
  }, []);

  // Tick para countdown en vivo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Onboarding: mostrar reglas la primera vez
  useEffect(() => {
    if (!user || rulesAutoOpened) return;
    const dismissed = localStorage.getItem(`prode_rules_dismissed_${user.id}`);
    if (!dismissed) {
      setRulesOpen(true);
      setRulesAutoOpened(true);
    }
  }, [user, rulesAutoOpened]);

  const handleAutoPredict = async () => {
    if (!user) return;
    const pendientes = upcoming.filter(
      (m) => !predsByMatch[m.id] && Date.now() < new Date(m.match_date).getTime() - LOCK_MS,
    );
    if (pendientes.length === 0) return;
    setAutoPredicting(true);
    const rows = pendientes.map((m) => ({
      user_id: user.id,
      match_id: m.id,
      predicted_home_score: randomScore(),
      predicted_away_score: randomScore(),
    }));
    const { error, data } = await supabase
      .from("predictions")
      .insert(rows)
      .select("match_id, predicted_home_score, predicted_away_score, points_awarded");
    setAutoPredicting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setPredsByMatch((prev) => {
      const next = { ...prev };
      (data ?? []).forEach((p: any) => {
        next[p.match_id] = p as PredRow;
      });
      return next;
    });
    toast({
      title: "🪔 Predicciones automáticas",
      description: `Se completaron ${pendientes.length} ${pendientes.length === 1 ? "predicción" : "predicciones"}.`,
    });
  };


  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const nowIso = new Date().toISOString();
      const [ranking, upcomingRes, recentRes, predsRes, profileRes, finishedRes, achievementsRes, teamAvatarsRes] = await Promise.all([
        supabase
          .from("user_ranking" as any)
          .select("user_id, email, first_name, last_name, avatar_seed, team_id, team_name, total_points, current_rank, previous_rank, team_current_rank, team_previous_rank")
          .order("total_points", { ascending: false })
          .order("email", { ascending: true }),
        supabase
          .from("matches")
          .select("id, stage, home_team, away_team, match_date, home_score, away_score, is_finished")
          .gte("match_date", nowIso)
          .order("match_date", { ascending: true })
          .limit(5),
        supabase
          .from("matches")
          .select("id, stage, home_team, away_team, match_date, home_score, away_score, is_finished")
          .lt("match_date", nowIso)
          .eq("is_finished", true)
          .order("match_date", { ascending: false })
          .limit(5),
        supabase
          .from("predictions")
          .select("match_id, predicted_home_score, predicted_away_score, points_awarded")
          .eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("matches")
          .select("id, match_date")
          .eq("is_finished", true)
          .order("match_date", { ascending: true }),
        supabase
          .from("achievements" as any)
          .select("scope, team_id, stage_group, position")
          .eq("user_id", user.id),
        supabase
          .from("team_avatars" as any)
          .select("id, team_id, name, team_avatar_ranks(total_points, current_rank, previous_rank)"),
      ]);

      setAchievements(((achievementsRes.data ?? []) as unknown) as Achievement[]);

      setMyProfile((profileRes.data as any) ?? null);

      const rows = ((ranking.data ?? []) as unknown) as Array<{ user_id: string; email: string | null; first_name: string | null; last_name: string | null; avatar_seed: string | null; team_id: string | null; team_name: string | null; total_points: number; current_rank: number | null; previous_rank: number | null; team_current_rank: number | null; team_previous_rank: number | null }>;
      setGlobalTotal(rows.length);
      const idx = rows.findIndex((r) => r.user_id === user.id);
      if (idx >= 0) {
        const me = rows[idx];
        setMyPosition(idx + 1);
        setMyPoints(me.total_points ?? 0);
        setMyCurrentRank(me.current_rank);
        setMyPreviousRank(me.previous_rank);
        setMyTeamId(me.team_id);
        setMyTeamName(me.team_name);
        setMyTeamCurrentRank(me.team_current_rank);
        setMyTeamPreviousRank(me.team_previous_rank);
        // Default switch a "team" si tiene equipo
        setRankView(me.team_id ? "team" : "global");

        // Ventana global (5 alrededor del usuario)
        let start = idx - 2;
        let end = idx + 2;
        if (start < 0) { end += -start; start = 0; }
        if (end > rows.length - 1) {
          start = Math.max(0, start - (end - (rows.length - 1)));
          end = rows.length - 1;
        }
        const windowRows = rows.slice(start, end + 1).map((r, i) => ({
          position: start + i + 1,
          user_id: r.user_id,
          email: r.email,
          first_name: r.first_name,
          last_name: r.last_name,
          avatar_seed: r.avatar_seed,
          team_name: r.team_name,
          total_points: r.total_points ?? 0,
          current_rank: r.current_rank,
          previous_rank: r.previous_rank,
        }));
        setRankingWindow(windowRows);

        // Ventana de equipo
        if (me.team_id) {
          const teamRows = rows
            .filter((r) => r.team_id === me.team_id)
            .sort((a, b) => {
              if ((b.total_points ?? 0) !== (a.total_points ?? 0)) return (b.total_points ?? 0) - (a.total_points ?? 0);
              return (a.email ?? "").localeCompare(b.email ?? "");
            });
          setMyTeamTotal(teamRows.length);
          const tIdx = teamRows.findIndex((r) => r.user_id === user.id);
          setMyTeamPosition(tIdx >= 0 ? tIdx + 1 : null);

          let tStart = tIdx - 2;
          let tEnd = tIdx + 2;
          if (tStart < 0) { tEnd += -tStart; tStart = 0; }
          if (tEnd > teamRows.length - 1) {
            tStart = Math.max(0, tStart - (tEnd - (teamRows.length - 1)));
            tEnd = teamRows.length - 1;
          }
          const teamWindow = teamRows.slice(tStart, tEnd + 1).map((r, i) => ({
            position: tStart + i + 1,
            user_id: r.user_id,
            email: r.email,
            first_name: r.first_name,
            last_name: r.last_name,
            avatar_seed: r.avatar_seed,
            total_points: r.total_points ?? 0,
            team_current_rank: r.team_current_rank,
            team_previous_rank: r.team_previous_rank,
          }));
          setTeamRankingWindow(teamWindow);
        } else {
          setMyTeamTotal(0);
          setMyTeamPosition(null);
          setTeamRankingWindow([]);
        }
      } else {
        setMyPosition(null);
        setMyPoints(0);
        setRankingWindow([]);
        setTeamRankingWindow([]);
      }

      // Inter-Áreas: ventana alrededor del área del usuario (o top 5 si no tiene)
      const avatarsRaw = (teamAvatarsRes.data ?? []) as any[];
      const avatars = avatarsRaw.map((r) => {
        const rank = Array.isArray(r.team_avatar_ranks) ? r.team_avatar_ranks[0] : r.team_avatar_ranks;
        return {
          team_avatar_id: r.id as string,
          team_id: r.team_id as string,
          name: r.name as string,
          total_points: (rank?.total_points as number) ?? 0,
          current_rank: (rank?.current_rank as number | null) ?? null,
          previous_rank: (rank?.previous_rank as number | null) ?? null,
        };
      }).sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return a.name.localeCompare(b.name);
      });
      const myTeamIdLocal = idx >= 0 ? rows[idx].team_id : null;
      const myAvatarIdx = myTeamIdLocal
        ? avatars.findIndex((a) => a.team_id === myTeamIdLocal)
        : -1;
      let aStart = 0;
      let aEnd = Math.min(4, avatars.length - 1);
      if (myAvatarIdx >= 0) {
        aStart = myAvatarIdx - 2;
        aEnd = myAvatarIdx + 2;
        if (aStart < 0) { aEnd += -aStart; aStart = 0; }
        if (aEnd > avatars.length - 1) {
          aStart = Math.max(0, aStart - (aEnd - (avatars.length - 1)));
          aEnd = avatars.length - 1;
        }
      }
      const interWindow = avatars.slice(aStart, aEnd + 1).map((a, i) => ({
        position: aStart + i + 1,
        ...a,
      }));
      setInterAreasWindow(interWindow);

      setUpcoming((upcomingRes.data ?? []) as MatchRow[]);
      setRecent(((recentRes.data ?? []) as MatchRow[]).slice().reverse());

      const map: Record<string, PredRow> = {};
      (predsRes.data ?? []).forEach((p: any) => {
        map[p.match_id] = p as PredRow;
      });
      setPredsByMatch(map);

      // Accuracy & streak: only over finished matches the user predicted
      const finishedMatches = (finishedRes.data ?? []) as Array<{ id: string; match_date: string }>;
      const resolved = finishedMatches
        .map((m) => ({ m, p: map[m.id] }))
        .filter((x) => x.p);

      if (resolved.length === 0) {
        setAccuracy(null);
        setStreak(0);
      } else {
        const hits = resolved.filter((x) => (x.p.points_awarded ?? 0) > 0).length;
        setAccuracy(Math.round((hits / resolved.length) * 100));
        // streak counting backwards from most recent
        let s = 0;
        for (let i = resolved.length - 1; i >= 0; i--) {
          if ((resolved[i].p.points_awarded ?? 0) > 0) s++;
          else break;
        }
        setStreak(s);
      }
    };
    load();
  }, [user]);

  return (
    <AppLayout>
      <RulesDialog
        open={rulesOpen}
        onOpenChange={setRulesOpen}
        showDontShowAgain={rulesAutoOpened}
        onDismissForever={() => {
          if (user) localStorage.setItem(`prode_rules_dismissed_${user.id}`, "1");
        }}
      />
      <div className="max-w-4xl mx-auto space-y-6">
        <section
          className="hero-stadium -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-32 md:pt-48 pb-8 md:pb-10 text-foreground"
          style={{ ["--hero-image" as any]: `url(${heroStadium})` }}
        >
          <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elegant">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-primary">Mundial 2026</span>
                </div>
                <button
                  type="button"
                  onClick={() => setRulesOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 hover:bg-primary/25 backdrop-blur px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 transition-colors"
                  title="Ver reglas del juego"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  Reglas
                </button>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-foreground drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                Bienvenido al Prode Mundial 2026
              </h1>
              <p className="text-base text-foreground/85 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                {user ? `Hola, ${firstName(myProfile ?? { email: user.email ?? null })}.` : ""} Predecí los partidos y competí con tus amigos.
              </p>
              {user && upcoming.length > 0 && (() => {
                const missing = upcoming.filter((m) => !predsByMatch[m.id]).length;
                return (
                  <p className="text-sm text-foreground/85 mt-2 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                    {missing === 0 ? (
                      "🏖️ Estás al día con tus predicciones"
                    ) : (
                      <>
                        🎯 Te faltan{" "}
                        <span className="font-bold bg-primary/20 px-1.5 py-0.5 rounded-md text-primary border border-primary/30">
                          {missing} {missing === 1 ? "predicción" : "predicciones"}
                        </span>{" "}
                        para estar al día
                      </>
                    )}
                  </p>
                );
              })()}
              {user && (accuracy !== null || streak >= 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {accuracy !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 backdrop-blur px-2.5 py-1 text-xs font-medium text-primary border border-primary/30">
                      🔍 Precisión {accuracy}%
                    </span>
                  )}
                  {accuracy !== null && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 backdrop-blur px-2.5 py-1 text-xs font-medium text-primary border border-primary/30">
                      Racha: {streak} {streakEmoji(streak)}
                    </span>
                  )}
                </div>
              )}

              {user && achievements.length > 0 && (() => {
                const sorted = [...achievements].sort((a, b) => {
                  // globales primero, luego equipo
                  if (a.scope !== b.scope) return a.scope === "global" ? -1 : 1;
                  // dentro de cada scope: tournament -> knockout -> group
                  return STAGE_ORDER[a.stage_group] - STAGE_ORDER[b.stage_group];
                });
                return (
                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-wide text-foreground/85 font-semibold mb-2 flex items-center gap-1.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
                      <span>🎖️</span>
                      <span>Logros</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sorted.map((a, i) => (
                        <AchievementChip
                          key={`${a.scope}-${a.stage_group}-${a.team_id ?? "g"}-${i}`}
                          scope={a.scope}
                          stageGroup={a.stage_group}
                          position={a.position}
                          teamName={a.scope === "team" ? myTeamName : null}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {user && myPosition && (
              <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:w-[200px]">
                {/* Global */}
                <div className="rounded-xl bg-card/80 backdrop-blur p-3 border border-border shadow-card">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    <span>🌐</span>
                    <span>Global</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold leading-none text-foreground">#{myPosition}</span>
                    <span className="text-xs text-muted-foreground">de {globalTotal}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    <span className="font-semibold text-primary">{myPoints} pts</span>
                    <TrendBadge current={myCurrentRank} previous={myPreviousRank} />
                  </div>
                </div>

                {/* Team */}
                <div className="rounded-xl bg-card/80 backdrop-blur p-3 border border-primary/30 shadow-card">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-primary font-medium">
                    <span>⭐</span>
                    <span className="truncate">{myTeamName ?? "Sin equipo"}</span>
                  </div>
                  {myTeamId && myTeamPosition ? (
                    <>
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold leading-none text-foreground">#{myTeamPosition}</span>
                        <span className="text-xs text-muted-foreground">de {myTeamTotal}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                        <TrendBadge current={myTeamCurrentRank} previous={myTeamPreviousRank} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {myTeamId ? "Sin posición aún." : "Sin equipo asignado."}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">Próximos partidos</CardTitle>
                <CardDescription>Lo que viene en breve.</CardDescription>
              </div>
              {(() => {
                const pendientes = upcoming.filter(
                  (m) => !predsByMatch[m.id] && now < new Date(m.match_date).getTime() - LOCK_MS,
                );
                if (pendientes.length === 0) return null;
                return (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAutoPredict}
                    disabled={autoPredicting}
                    className="shrink-0 mt-1"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Predecir Automáticamente</span>
                    <span className="sm:hidden">🪔 Auto</span>
                  </Button>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay próximos partidos.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border bg-card">
                {upcoming.map((m) => {
                  const pred = predsByMatch[m.id];
                  const deadline = new Date(m.match_date).getTime() - LOCK_MS;
                  const remaining = deadline - now;
                  const cd = formatCountdown(remaining);
                  const isClosed = remaining <= 0;
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">
                        {formatShortDate(m.match_date)}
                      </span>
                      <span className="flex-1 min-w-0 truncate flex items-center gap-2">
                        <span className="truncate inline-flex items-center gap-1.5">
                          <TeamName name={m.home_team} />
                          <span className="text-muted-foreground">vs</span>
                          <TeamName name={m.away_team} />
                        </span>
                        <MultiplierBadge stage={m.stage} />
                      </span>
                      {pred ? (
                        <span className="shrink-0 text-xs text-muted-foreground hidden sm:inline">
                          Tu predicción:{" "}
                          <span className="font-semibold text-foreground">
                            {pred.predicted_home_score} - {pred.predicted_away_score}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold tabular-nums",
                            toneClass(cd.tone),
                          )}
                          title="Tiempo restante para predecir"
                        >
                          {cd.text}
                        </span>
                      )}
                      {pred ? (
                        <Button asChild size="sm" variant="ghost" className="shrink-0 h-8 px-2 text-xs">
                          <Link to={`/prediccion?match=${m.id}`}>Modificar</Link>
                        </Button>
                      ) : isClosed ? (
                        <Button size="sm" disabled className="shrink-0 h-8 px-2 text-xs">
                          Cerrado
                        </Button>
                      ) : (
                        <Button asChild size="sm" className="shrink-0 h-8 px-2 text-xs">
                          <Link to={`/prediccion?match=${m.id}`}>Cargar resultados</Link>
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Card A — Ranking individual con switch Global/Equipo */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">Ranking</CardTitle>
                  <CardDescription>
                    {rankView === "global"
                      ? (myPosition ? `Global: #${myPosition} de ${globalTotal} · ${myPoints} pts` : "Aún no tenés posición global.")
                      : (myTeamPosition ? `Equipo ${myTeamName ?? ""}: #${myTeamPosition} de ${myTeamTotal} · ${myPoints} pts` : (myTeamId ? "Sin posición en equipo." : "Sin equipo asignado."))}
                  </CardDescription>
                </div>
                {myTeamId && (
                  <div className="flex items-center gap-2 shrink-0 mt-1">
                    <button
                      type="button"
                      onClick={() => setRankView("global")}
                      className={cn(
                        "text-base transition-opacity",
                        rankView === "global" ? "opacity-100" : "opacity-40 hover:opacity-70"
                      )}
                      title="Ranking global"
                      aria-label="Ranking global"
                    >
                      🌐
                    </button>
                    <Switch
                      checked={rankView === "team"}
                      onCheckedChange={(checked) => setRankView(checked ? "team" : "global")}
                      aria-label="Cambiar entre ranking global y de equipo"
                    />
                    <button
                      type="button"
                      onClick={() => setRankView("team")}
                      className={cn(
                        "text-base transition-opacity",
                        rankView === "team" ? "opacity-100" : "opacity-40 hover:opacity-70"
                      )}
                      title={`Ranking de equipo${myTeamName ? `: ${myTeamName}` : ""}`}
                      aria-label="Ranking de equipo"
                    >
                      ⭐
                    </button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {rankView === "global" ? (
                rankingWindow.length > 0 && (
                  <ul className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                    {rankingWindow.map((r) => {
                      const isMe = r.user_id === user?.id;
                      const name = displayName(r);
                      return (
                        <li
                          key={r.user_id}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            isMe ? "bg-primary/10 border-l-2 border-l-primary font-semibold" : ""
                          }`}
                        >
                          <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">
                            #{r.position}
                          </span>
                          <UserAvatar seed={r.avatar_seed} name={name} className="h-7 w-7 shrink-0" />
                          <span className="flex-1 min-w-0 truncate">
                            <span className="block truncate">{name}</span>
                            {r.team_name && (
                              <span className="block text-[11px] text-muted-foreground truncate font-normal">
                                {r.team_name}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs tabular-nums flex items-center gap-2">
                            <span className={isMe ? "text-primary" : "text-muted-foreground"}>
                              {r.total_points} pts
                            </span>
                            <TrendBadge current={r.current_rank} previous={r.previous_rank} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                teamRankingWindow.length > 0 ? (
                  <ul className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                    {teamRankingWindow.map((r) => {
                      const isMe = r.user_id === user?.id;
                      const name = displayName(r);
                      return (
                        <li
                          key={r.user_id}
                          className={`flex items-center gap-2 px-3 py-2 text-sm ${
                            isMe ? "bg-primary/10 border-l-2 border-l-primary font-semibold" : ""
                          }`}
                        >
                          <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">
                            #{r.position}
                          </span>
                          <UserAvatar seed={r.avatar_seed} name={name} className="h-7 w-7 shrink-0" />
                          <span className="flex-1 min-w-0 truncate">{name}</span>
                          <span className="shrink-0 text-xs tabular-nums flex items-center gap-2">
                            <span className={isMe ? "text-primary" : "text-muted-foreground"}>
                              {r.total_points} pts
                            </span>
                            <TrendBadge current={r.team_current_rank} previous={r.team_previous_rank} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    {myTeamId ? "Sin posición en equipo." : "Sin equipo asignado."}
                  </p>
                )
              )}
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link to="/ranking">Ver ranking</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card B — Ranking Inter-Áreas */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Inter Áreas</CardTitle>
              <CardDescription>
                {myTeamId
                  ? "Tu área entre las más cercanas."
                  : "Top de áreas por promedio de puntos."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {interAreasWindow.length > 0 ? (
                <ul className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                  {interAreasWindow.map((r) => {
                    const isMine = !!myTeamId && r.team_id === myTeamId;
                    return (
                      <li
                        key={r.team_avatar_id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm ${
                          isMine ? "bg-primary/10 border-l-2 border-l-primary font-semibold" : ""
                        }`}
                      >
                        <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">
                          #{r.position}
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="flex-1 min-w-0 truncate">{r.name}</span>
                        <span className="shrink-0 text-xs tabular-nums flex items-center gap-2">
                          <span className={isMine ? "text-primary" : "text-muted-foreground"}>
                            {r.total_points} pts
                          </span>
                          <TrendBadge current={r.current_rank} previous={r.previous_rank} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-2">Aún no hay datos de áreas.</p>
              )}
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link to="/ranking">Ver ranking</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Últimos partidos</CardTitle>
            <CardDescription>Lo que acaba de pasar.</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay partidos jugados.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border bg-card">
                {recent.map((m) => {
                  const pred = predsByMatch[m.id];
                  return (
                    <li key={m.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-28 shrink-0 text-xs text-muted-foreground">
                        {formatShortDate(m.match_date)}
                      </span>
                      <span className="flex-1 min-w-0 truncate flex items-center gap-2">
                        <span className="truncate inline-flex items-center gap-1.5">
                          <TeamName name={m.home_team} />
                          <span className="text-muted-foreground">vs</span>
                          <TeamName name={m.away_team} />
                        </span>
                        <MultiplierBadge stage={m.stage} />
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        Real:{" "}
                        <span className="font-semibold text-primary">
                          {m.home_score ?? "-"} - {m.away_score ?? "-"}
                        </span>
                        {pred && (
                          <>
                            {" "}
                            · Tuya:{" "}
                            <span className="font-semibold text-foreground">
                              {pred.predicted_home_score} - {pred.predicted_away_score}
                            </span>{" "}
                            <span className="font-semibold text-primary">
                              +{pred.points_awarded ?? 0} pts
                            </span>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Index;
