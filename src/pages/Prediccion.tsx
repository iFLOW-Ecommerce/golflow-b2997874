import { useEffect, useMemo, useRef, useState } from "react";
import { Target, Loader2, Check, Zap } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Match = {
  id: string;
  stage: string;
  group_name: string | null;
  home_team: string;
  away_team: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
};

type ScoreInput = { home: string; away: string; points?: number };

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const STAGE_MULTIPLIER: Record<string, number> = {
  round_of_16: 2,
  quarterfinal: 3,
  semifinal: 4,
  third_place: 5,
  final: 5,
};

const getMultiplier = (stage: string) => STAGE_MULTIPLIER[stage] ?? 1;

const MultiplierBadge = ({ stage }: { stage: string }) => {
  const mult = getMultiplier(stage);
  if (mult <= 1) return null;
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
      <Zap className="h-3 w-3" fill="currentColor" />×{mult}
    </span>
  );
};

const KO_STAGES: { key: string; label: string }[] = [
  { key: "round_of_32", label: "Dieciseisavos" },
  { key: "round_of_16", label: "Octavos" },
  { key: "quarterfinal", label: "Cuartos" },
  { key: "semifinal", label: "Semifinales" },
  { key: "third_place", label: "Tercer puesto" },
  { key: "final", label: "Final" },
];

const formatDate = (iso: string) => {
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

const LOCK_MS = 60 * 60 * 1000;
const isLocked = (iso: string) => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() >= t - LOCK_MS;
};

const Prediccion = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [inputs, setInputs] = useState<Record<string, ScoreInput>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [statusByMatch, setStatusByMatch] = useState<Record<string, "saving" | "saved" | "error">>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savedTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [, setNowTick] = useState(0);

  useEffect(() => {
    document.title = "Mi Predicción | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [matchesRes, predsRes] = await Promise.all([
        supabase
          .from("matches")
          .select("id, stage, group_name, home_team, away_team, match_date, created_at, home_score, away_score, is_finished")
          .order("match_date", { ascending: true })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("predictions")
          .select("match_id, predicted_home_score, predicted_away_score, points_awarded")
          .eq("user_id", user.id),
      ]);

      if (matchesRes.error) {
        toast.error("Error al cargar partidos");
      } else {
        setMatches((matchesRes.data ?? []) as Match[]);
      }

      const initial: Record<string, ScoreInput> = {};
      const keys = new Set<string>();
      (predsRes.data ?? []).forEach((p) => {
        initial[p.match_id] = {
          home: String(p.predicted_home_score),
          away: String(p.predicted_away_score),
          points: p.points_awarded ?? 0,
        };
        keys.add(p.match_id);
      });
      setInputs(initial);
      setSavedKeys(keys);
      setLoading(false);
    };
    load();
  }, [user]);

  const groupMatches = useMemo(
    () => matches.filter((m) => m.stage === "group"),
    [matches],
  );

  const koMatches = useMemo(
    () => matches.filter((m) => m.stage !== "group"),
    [matches],
  );

  const grouped = useMemo(() => {
    const map: Record<string, Match[]> = {};
    groupMatches.forEach((m) => {
      const g = m.group_name ?? "?";
      (map[g] ||= []).push(m);
    });
    // Ensure stable order within each group by created_at via initial sort
    for (const g of Object.keys(map)) {
      map[g].sort((a, b) => a.match_date.localeCompare(b.match_date));
    }
    return map;
  }, [groupMatches]);

  const koByStage = useMemo(() => {
    const map: Record<string, Match[]> = {};
    koMatches.forEach((m) => {
      (map[m.stage] ||= []).push(m);
    });
    return map;
  }, [koMatches]);

  const completedGroups = useMemo(
    () => groupMatches.filter((m) => savedKeys.has(m.id)).length,
    [groupMatches, savedKeys],
  );

  const completedKO = useMemo(
    () => koMatches.filter((m) => savedKeys.has(m.id)).length,
    [koMatches, savedKeys],
  );

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
      Object.values(savedTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  const persist = async (matchId: string, home: number, away: number) => {
    if (!user) return;
    setStatusByMatch((s) => ({ ...s, [matchId]: "saving" }));
    const { error } = await supabase
      .from("predictions")
      .upsert(
        {
          user_id: user.id,
          match_id: matchId,
          predicted_home_score: home,
          predicted_away_score: away,
        },
        { onConflict: "user_id,match_id" },
      );
    if (error) {
      setStatusByMatch((s) => ({ ...s, [matchId]: "error" }));
      toast.error("No se pudo guardar");
      return;
    }
    setSavedKeys((prev) => {
      if (prev.has(matchId)) return prev;
      const next = new Set(prev);
      next.add(matchId);
      return next;
    });
    setStatusByMatch((s) => ({ ...s, [matchId]: "saved" }));
    if (savedTimersRef.current[matchId]) clearTimeout(savedTimersRef.current[matchId]);
    savedTimersRef.current[matchId] = setTimeout(() => {
      setStatusByMatch((s) => {
        if (s[matchId] !== "saved") return s;
        const { [matchId]: _, ...rest } = s;
        return rest;
      });
    }, 1500);
  };

  const scheduleSave = (matchId: string, home: string, away: string) => {
    if (timersRef.current[matchId]) clearTimeout(timersRef.current[matchId]);
    if (home === "" || away === "") return;
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return;
    const m = matches.find((x) => x.id === matchId);
    if (m && isLocked(m.match_date)) return;
    timersRef.current[matchId] = setTimeout(() => {
      persist(matchId, h, a);
    }, 700);
  };

  const handleChange = (matchId: string, side: "home" | "away", value: string) => {
    if (value !== "" && !/^\d{1,2}$/.test(value)) return;
    const m = matches.find((x) => x.id === matchId);
    if (m && isLocked(m.match_date)) return;
    setInputs((prev) => {
      const current = prev[matchId] ?? { home: "", away: "" };
      const next = { ...current, [side]: value };
      scheduleSave(matchId, next.home, next.away);
      return { ...prev, [matchId]: next };
    });
  };

  const handleBlur = (matchId: string) => {
    const v = inputs[matchId];
    if (!v) return;
    if (v.home === "" || v.away === "") return;
    const m = matches.find((x) => x.id === matchId);
    if (m && isLocked(m.match_date)) return;
    if (timersRef.current[matchId]) {
      clearTimeout(timersRef.current[matchId]);
      delete timersRef.current[matchId];
    }
    const h = Number(v.home);
    const a = Number(v.away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return;
    persist(matchId, h, a);
  };

  const computePointsBreakdown = (
    ph: number,
    pa: number,
    ah: number,
    aw: number,
    stage: string,
  ): { total: number; parts: string[]; multiplier: number } => {
    const parts: string[] = [];
    let total = 0;
    const po = ph > pa ? "home" : ph < pa ? "away" : "draw";
    const ao = ah > aw ? "home" : ah < aw ? "away" : "draw";
    if (po === ao) {
      total += 3;
      parts.push("3 por acertar resultado");
    }
    if (ph === ah && pa === aw) {
      const totalGoals = ah + aw;
      const bonus = totalGoals <= 1 ? 3 : 3 + (totalGoals - 1);
      total += bonus;
      parts.push(`${bonus} por acertar marcador exacto`);
    }
    const multiplier = getMultiplier(stage);
    return { total: total * multiplier, parts, multiplier };
  };

  const renderMatchRow = (m: Match) => {
    const v = inputs[m.id] ?? { home: "", away: "" };
    const isSaved = savedKeys.has(m.id);
    const status = statusByMatch[m.id];
    const locked = isLocked(m.match_date);
    const hasRealResult =
      m.is_finished && m.home_score !== null && m.away_score !== null;
    const hasPrediction = v.home !== "" && v.away !== "";
    const breakdown =
      hasRealResult && hasPrediction
        ? computePointsBreakdown(
            Number(v.home),
            Number(v.away),
            m.home_score as number,
            m.away_score as number,
            m.stage,
          )
        : null;
    return (
      <div key={m.id} className={`rounded-lg border bg-card p-3 sm:p-4 ${locked ? "opacity-70" : ""}`}>
        <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>{formatDate(m.match_date)} hs</span>
            <MultiplierBadge stage={m.stage} />
          </div>
          {locked && (
            <span className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground">
              Cerrado
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex flex-1 items-center justify-between sm:justify-center gap-3 min-w-0">
            <span className="text-sm sm:text-base font-medium truncate text-right flex-1 sm:flex-initial sm:w-40">
              {m.home_team}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="text"
                inputMode="numeric"
                aria-label={`Goles ${m.home_team}`}
                value={v.home}
                onChange={(e) => handleChange(m.id, "home", e.target.value)}
                onBlur={() => handleBlur(m.id)}
                disabled={locked}
                className="w-12 h-10 text-center px-1 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-100"
              />
              <span className="text-muted-foreground text-sm">vs</span>
              <Input
                type="text"
                inputMode="numeric"
                aria-label={`Goles ${m.away_team}`}
                value={v.away}
                onChange={(e) => handleChange(m.id, "away", e.target.value)}
                onBlur={() => handleBlur(m.id)}
                disabled={locked}
                className="w-12 h-10 text-center px-1 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-100"
              />
            </div>
            <span className="text-sm sm:text-base font-medium truncate flex-1 sm:flex-initial sm:w-40">
              {m.away_team}
            </span>
          </div>
          <div className="flex items-center justify-end sm:w-28 text-xs text-muted-foreground min-h-[1.25rem]" aria-live="polite">
            {status === "saving" ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando...
              </span>
            ) : status === "saved" ? (
              <span className="flex items-center gap-1 text-primary">
                <Check className="h-3 w-3" />
                Guardado
              </span>
            ) : isSaved ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Guardado
              </span>
            ) : null}
          </div>
        </div>
        {(hasRealResult || hasPrediction) && (
          <div className="mt-2 pt-2 border-t text-xs sm:text-sm text-muted-foreground space-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {hasPrediction && (
                <span>
                  Tu predicción:{" "}
                  <span className="font-semibold text-foreground">
                    {v.home}-{v.away}
                  </span>
                </span>
              )}
              {hasRealResult && (
                <>
                  <span className="text-muted-foreground/50">|</span>
                  <span>
                    Real:{" "}
                    <span className="font-semibold text-primary">
                      {m.home_score}-{m.away_score}
                    </span>
                  </span>
                </>
              )}
            </div>
            {breakdown && (
              <div>
                Puntos:{" "}
                <span className="font-semibold text-foreground">
                  {breakdown.total}
                </span>
                {breakdown.parts.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}
                    ({breakdown.parts.join(" + ")}
                    {breakdown.multiplier > 1 ? ` × ${breakdown.multiplier}` : ""})
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mi Predicción</h1>
              <p className="text-sm text-muted-foreground">Mundial 2026</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-sm">
              {completedGroups}/48 grupos
            </Badge>
            <Badge variant="secondary" className="text-sm">
              {completedKO}/{koMatches.length || 31} eliminatorias
            </Badge>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando partidos...
          </div>
        ) : (
          <Tabs defaultValue="grupos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="grupos">Fase de grupos</TabsTrigger>
              <TabsTrigger value="eliminatorias">Eliminatorias</TabsTrigger>
            </TabsList>

            <TabsContent value="grupos" className="mt-4">
              <Tabs defaultValue="A" className="w-full">
                <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-muted p-1">
                  {GROUPS.map((g) => (
                    <TabsTrigger key={g} value={g} className="px-3 py-1.5 text-sm">
                      Grupo {g}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {GROUPS.map((g) => (
                  <TabsContent key={g} value={g} className="mt-4">
                    <Card className="shadow-card">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Grupo {g}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(grouped[g] ?? []).map((m) => renderMatchRow(m))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            </TabsContent>

            <TabsContent value="eliminatorias" className="mt-4 space-y-4">
              {KO_STAGES.map((s) => {
                const list = koByStage[s.key] ?? [];
                if (list.length === 0) return null;
                return (
                  <Card key={s.key} className="shadow-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{s.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {list.map((m) => renderMatchRow(m))}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default Prediccion;
