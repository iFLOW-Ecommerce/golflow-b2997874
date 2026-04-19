import { useEffect, useMemo, useRef, useState } from "react";
import { Target, Loader2, Check } from "lucide-react";
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
  group_name: string | null;
  home_team: string;
  away_team: string;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
};

type ScoreInput = { home: string; away: string };

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const Prediccion = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [inputs, setInputs] = useState<Record<string, ScoreInput>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [statusByMatch, setStatusByMatch] = useState<Record<string, "saving" | "saved" | "error">>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const savedTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    document.title = "Mi Predicción | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [matchesRes, predsRes] = await Promise.all([
        supabase
          .from("matches")
          .select("id, group_name, home_team, away_team, match_date, created_at, home_score, away_score, is_finished")
          .eq("stage", "group")
          .order("group_name", { ascending: true })
          .order("created_at", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("predictions")
          .select("match_id, predicted_home_score, predicted_away_score")
          .eq("user_id", user.id),
      ]);

      if (matchesRes.error) {
        toast.error("Error al cargar partidos");
      } else {
        setMatches(matchesRes.data ?? []);
      }

      const initial: Record<string, ScoreInput> = {};
      const keys = new Set<string>();
      (predsRes.data ?? []).forEach((p) => {
        initial[p.match_id] = {
          home: String(p.predicted_home_score),
          away: String(p.predicted_away_score),
        };
        keys.add(p.match_id);
      });
      setInputs(initial);
      setSavedKeys(keys);
      setLoading(false);
    };
    load();
  }, [user]);

  const grouped = useMemo(() => {
    const map: Record<string, Match[]> = {};
    matches.forEach((m) => {
      const g = m.group_name ?? "?";
      (map[g] ||= []).push(m);
    });
    return map;
  }, [matches]);

  const completedCount = savedKeys.size;

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
    timersRef.current[matchId] = setTimeout(() => {
      persist(matchId, h, a);
    }, 700);
  };

  const handleChange = (matchId: string, side: "home" | "away", value: string) => {
    if (value !== "" && !/^\d{1,2}$/.test(value)) return;
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
    if (timersRef.current[matchId]) {
      clearTimeout(timersRef.current[matchId]);
      delete timersRef.current[matchId];
    }
    const h = Number(v.home);
    const a = Number(v.away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return;
    persist(matchId, h, a);
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
              <p className="text-sm text-muted-foreground">Fase de grupos · Mundial 2026</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {completedCount}/48
          </Badge>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando partidos...
          </div>
        ) : (
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
                    {(grouped[g] ?? []).map((m) => {
                      const v = inputs[m.id] ?? { home: "", away: "" };
                      const isSaved = savedKeys.has(m.id);
                      const status = statusByMatch[m.id];
                      const hasRealResult =
                        m.is_finished && m.home_score !== null && m.away_score !== null;
                      const hasPrediction = v.home !== "" && v.away !== "";
                      return (
                        <div
                          key={m.id}
                          className="rounded-lg border bg-card p-3 sm:p-4"
                        >
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
                                  className="w-12 h-10 text-center px-1"
                                />
                                <span className="text-muted-foreground text-sm">vs</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  aria-label={`Goles ${m.away_team}`}
                                  value={v.away}
                                  onChange={(e) => handleChange(m.id, "away", e.target.value)}
                                  onBlur={() => handleBlur(m.id)}
                                  className="w-12 h-10 text-center px-1"
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
                            <div className="mt-2 pt-2 border-t text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
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
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

export default Prediccion;
