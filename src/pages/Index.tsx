import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, BarChart3, CalendarClock, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MultiplierBadge } from "@/lib/multiplier";
import { TeamName } from "@/lib/country-flag";
import { TrendBadge } from "@/lib/trend-badge";
import { UserAvatar } from "@/lib/user-avatar";
import { displayName, firstName } from "@/lib/display-name";

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
  const [rankingWindow, setRankingWindow] = useState<Array<{ position: number; user_id: string; email: string | null; first_name: string | null; last_name: string | null; avatar_seed: string | null; total_points: number; current_rank: number | null; previous_rank: number | null }>>([]);
  const [upcoming, setUpcoming] = useState<MatchRow[]>([]);
  const [recent, setRecent] = useState<MatchRow[]>([]);
  const [predsByMatch, setPredsByMatch] = useState<Record<string, PredRow>>({});
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    document.title = "Inicio | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const nowIso = new Date().toISOString();
      const [ranking, upcomingRes, recentRes, predsRes, profileRes, finishedRes] = await Promise.all([
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
      ]);

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
        } else {
          setMyTeamTotal(0);
          setMyTeamPosition(null);
        }

        let start = idx - 2;
        let end = idx + 2;
        if (start < 0) {
          end += -start;
          start = 0;
        }
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
          total_points: r.total_points ?? 0,
          current_rank: r.current_rank,
          previous_rank: r.previous_rank,
        }));
        setRankingWindow(windowRows);
      } else {
        setMyPosition(null);
        setMyPoints(0);
        setRankingWindow([]);
      }

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
      <div className="max-w-4xl mx-auto space-y-6">
        <section
          className="rounded-2xl p-6 md:p-10 text-primary-foreground shadow-elegant"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Trophy className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium opacity-90">Mundial 2026</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Bienvenido al Prode Mundial 2026
              </h1>
              <p className="text-base opacity-90">
                {user ? `Hola, ${firstName(myProfile ?? { email: user.email ?? null })}.` : ""} Predecí los partidos y competí con tus amigos.
              </p>
              {user && upcoming.length > 0 && (() => {
                const missing = upcoming.filter((m) => !predsByMatch[m.id]).length;
                return (
                  <p className="text-sm opacity-90 mt-2">
                    {missing === 0 ? (
                      "🏖️ Estás al día con tus predicciones"
                    ) : (
                      <>
                        🎯 Te faltan{" "}
                        <span className="font-bold bg-white/20 px-1.5 py-0.5 rounded-md text-primary-foreground">
                          {missing} {missing === 1 ? "predicción" : "predicciones"}
                        </span>{" "}
                        para estar al día
                      </>
                    )}
                  </p>
                );
              })()}
            </div>

            {user && myPosition && (
              <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:w-[200px]">
                {/* Global */}
                <div className="rounded-xl bg-white/10 backdrop-blur p-3 border border-white/15">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide opacity-90 font-medium">
                    <span>🌐</span>
                    <span>Global</span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold leading-none">#{myPosition}</span>
                    <span className="text-xs opacity-80">de {globalTotal}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    <span className="font-semibold">{myPoints} pts</span>
                    <TrendBadge current={myCurrentRank} previous={myPreviousRank} />
                  </div>
                </div>

                {/* Team */}
                <div className="rounded-xl bg-white/15 backdrop-blur p-3 border border-white/20">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide opacity-90 font-medium">
                    <span>⭐</span>
                    <span className="truncate">{myTeamName ?? "Sin equipo"}</span>
                  </div>
                  {myTeamId && myTeamPosition ? (
                    <>
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold leading-none">#{myTeamPosition}</span>
                        <span className="text-xs opacity-80">de {myTeamTotal}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                        <TrendBadge current={myTeamCurrentRank} previous={myTeamPreviousRank} />
                      </div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs opacity-80">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Próximos partidos</CardTitle>
            <CardDescription>Lo que viene en breve.</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay próximos partidos.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border bg-card">
                {upcoming.map((m) => {
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
                      {pred ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          Tu predicción:{" "}
                          <span className="font-semibold text-foreground">
                            {pred.predicted_home_score} - {pred.predicted_away_score}
                          </span>
                        </span>
                      ) : (
                        <Link
                          to={`/prediccion?match=${m.id}`}
                          aria-label="Cargar predicción"
                          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          <span className="font-semibold">– –</span>
                          <Clock className="h-4 w-4" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Ranking</CardTitle>
            <CardDescription>
              {myPosition
                ? `Tu posición actual: #${myPosition} con ${myPoints} puntos.`
                : "Aún no tenés posición en el ranking."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rankingWindow.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                {rankingWindow.map((r) => {
                  const isMe = r.user_id === user?.id;
                  const name = displayName(r);
                  return (
                    <li
                      key={r.user_id}
                      className={`flex items-center gap-3 px-3 py-2 text-sm ${
                        isMe ? "bg-primary/10 border-l-2 border-l-primary font-semibold" : ""
                      }`}
                    >
                      <span className="w-8 shrink-0 text-xs text-muted-foreground tabular-nums">
                        #{r.position}
                      </span>
                      <UserAvatar seed={r.avatar_seed} name={name} className="h-7 w-7" />
                      <span className="flex-1 min-w-0 truncate">{name}</span>
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
            )}
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
              <Link to="/ranking">Ver ranking</Link>
            </Button>
          </CardContent>
        </Card>

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
