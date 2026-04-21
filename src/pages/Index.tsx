import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Target, BarChart3, CalendarClock, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MultiplierBadge } from "@/lib/multiplier";

const TOTAL_GROUP_MATCHES = 48;
const TOTAL_KNOCKOUT_MATCHES = 31;
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

const Index = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<number | null>(null);
  const [completedKO, setCompletedKO] = useState<number | null>(null);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number>(0);
  const [rankingWindow, setRankingWindow] = useState<Array<{ position: number; user_id: string; email: string | null; total_points: number }>>([]);
  const [upcoming, setUpcoming] = useState<MatchRow[]>([]);
  const [recent, setRecent] = useState<MatchRow[]>([]);
  const [predsByMatch, setPredsByMatch] = useState<Record<string, PredRow>>({});

  useEffect(() => {
    document.title = "Inicio | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const nowIso = new Date().toISOString();
      const [{ count }, ranking, upcomingRes, recentRes, predsRes, koMatchesRes] = await Promise.all([
        supabase
          .from("predictions")
          .select("id, matches!inner(stage)", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("matches.stage", "group"),
        supabase
          .from("user_ranking" as any)
          .select("user_id, email, total_points")
          .order("total_points", { ascending: false }),
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
          .from("matches")
          .select("id")
          .in("stage", KNOCKOUT_STAGES),
      ]);

      setCompleted(count ?? 0);
      const koIds = new Set(((koMatchesRes.data ?? []) as Array<{ id: string }>).map((m) => m.id));
      const koCount = (predsRes.data ?? []).filter((p: any) => koIds.has(p.match_id)).length;
      setCompletedKO(koCount);
      const rows = ((ranking.data ?? []) as unknown) as Array<{ user_id: string; total_points: number }>;
      const idx = rows.findIndex((r) => r.user_id === user.id);
      if (idx >= 0) {
        setMyPosition(idx + 1);
        setMyPoints(rows[idx].total_points ?? 0);
      } else {
        setMyPosition(null);
        setMyPoints(0);
      }

      setUpcoming((upcomingRes.data ?? []) as MatchRow[]);
      // reverse recent so the oldest is at the bottom
      setRecent(((recentRes.data ?? []) as MatchRow[]).slice().reverse());

      const map: Record<string, PredRow> = {};
      (predsRes.data ?? []).forEach((p: any) => {
        map[p.match_id] = p as PredRow;
      });
      setPredsByMatch(map);
    };
    load();
  }, [user]);

  const done = completed ?? 0;
  const percent = Math.round((done / TOTAL_GROUP_MATCHES) * 100);
  const doneKO = completedKO ?? 0;
  const percentKO = Math.round((doneKO / TOTAL_KNOCKOUT_MATCHES) * 100);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <section
          className="rounded-2xl p-6 md:p-10 text-primary-foreground shadow-elegant"
          style={{ background: "var(--gradient-hero)" }}
        >
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
            {user?.email ? `Hola, ${user.email}.` : ""} Predecí los partidos y competí con tus amigos.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Mi Predicción</CardTitle>
              <CardDescription>Fase de grupos del Mundial 2026.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Predicciones de grupos completadas:{" "}
                  <span className="font-semibold text-foreground">
                    {done} de {TOTAL_GROUP_MATCHES}
                  </span>
                </p>
                <Progress value={percent} className="h-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Predicciones de eliminatorias completadas:{" "}
                  <span className="font-semibold text-foreground">
                    {doneKO} de {TOTAL_KNOCKOUT_MATCHES}
                  </span>
                </p>
                <Progress value={percentKO} className="h-2" />
              </div>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link to="/prediccion">Cargar predicciones</Link>
              </Button>
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
            <CardContent>
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link to="/ranking">Ver ranking</Link>
              </Button>
            </CardContent>
          </Card>
        </section>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary mb-2">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base">Próximos y últimos partidos</CardTitle>
            <CardDescription>Lo que viene y lo que acaba de pasar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Próximos partidos
              </h3>
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
                          <span className="truncate">
                            <span className="font-medium">{m.home_team}</span>
                            <span className="text-muted-foreground"> vs </span>
                            <span className="font-medium">{m.away_team}</span>
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
                            to="/prediccion"
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
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Últimos partidos
              </h3>
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
                          <span className="truncate">
                            <span className="font-medium">{m.home_team}</span>
                            <span className="text-muted-foreground"> vs </span>
                            <span className="font-medium">{m.away_team}</span>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Index;
