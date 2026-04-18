import { useEffect, useMemo, useState } from "react";
import { Target, Loader2, Save } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
};

type ScoreInput = { home: string; away: string };

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const Prediccion = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [inputs, setInputs] = useState<Record<string, ScoreInput>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

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
          .select("id, group_name, home_team, away_team, match_date")
          .eq("stage", "group")
          .order("group_name", { ascending: true })
          .order("match_date", { ascending: true }),
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

  const handleChange = (matchId: string, side: "home" | "away", value: string) => {
    if (value !== "" && !/^\d{1,2}$/.test(value)) return;
    setInputs((prev) => ({
      ...prev,
      [matchId]: { home: prev[matchId]?.home ?? "", away: prev[matchId]?.away ?? "", [side]: value },
    }));
  };

  const handleSave = async (matchId: string) => {
    if (!user) return;
    const v = inputs[matchId];
    const home = Number(v?.home);
    const away = Number(v?.away);
    if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
      toast.error("Ingresá un resultado válido");
      return;
    }
    setSaving(matchId);
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
    setSaving(null);
    if (error) {
      toast.error("No se pudo guardar la predicción");
      return;
    }
    setSavedKeys((prev) => new Set(prev).add(matchId));
    toast.success("Predicción guardada");
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
                                  className="w-12 h-10 text-center px-1"
                                />
                                <span className="text-muted-foreground text-sm">vs</span>
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  aria-label={`Goles ${m.away_team}`}
                                  value={v.away}
                                  onChange={(e) => handleChange(m.id, "away", e.target.value)}
                                  className="w-12 h-10 text-center px-1"
                                />
                              </div>
                              <span className="text-sm sm:text-base font-medium truncate flex-1 sm:flex-initial sm:w-40">
                                {m.away_team}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleSave(m.id)}
                              disabled={saving === m.id || v.home === "" || v.away === ""}
                              variant={isSaved ? "secondary" : "default"}
                              className="sm:w-28"
                            >
                              {saving === m.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  {isSaved ? "Actualizar" : "Guardar"}
                                </>
                              )}
                            </Button>
                          </div>
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
