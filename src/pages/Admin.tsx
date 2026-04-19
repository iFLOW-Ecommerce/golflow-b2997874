import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ShieldAlert } from "lucide-react";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  group_name: string | null;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

type Draft = Record<string, { home: string; away: string }>;

const Admin = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [user]);

  useEffect(() => {
    if (isAdmin !== true) return;
    setLoadingData(true);
    supabase
      .from("matches")
      .select("id, home_team, away_team, group_name, match_date, home_score, away_score, is_finished")
      .eq("stage", "group")
      .order("group_name", { ascending: true })
      .order("match_date", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Error cargando partidos");
        } else if (data) {
          setMatches(data as Match[]);
          const initial: Draft = {};
          for (const m of data as Match[]) {
            initial[m.id] = {
              home: m.home_score?.toString() ?? "",
              away: m.away_score?.toString() ?? "",
            };
          }
          setDraft(initial);
        }
        setLoadingData(false);
      });
  }, [isAdmin]);

  const dirtyIds = useMemo(() => {
    return matches
      .filter((m) => {
        const d = draft[m.id];
        if (!d) return false;
        const origHome = m.home_score?.toString() ?? "";
        const origAway = m.away_score?.toString() ?? "";
        return d.home !== origHome || d.away !== origAway;
      })
      .map((m) => m.id);
  }, [matches, draft]);

  const handleChange = (id: string, side: "home" | "away", value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [side]: value },
    }));
  };

  const handleSaveAll = async () => {
    if (dirtyIds.length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }
    setSaving(true);
    let okCount = 0;
    let errCount = 0;

    for (const id of dirtyIds) {
      const d = draft[id];
      const home = d.home === "" ? null : parseInt(d.home, 10);
      const away = d.away === "" ? null : parseInt(d.away, 10);
      const isFinished = home !== null && away !== null;

      const { error } = await supabase
        .from("matches")
        .update({
          home_score: home,
          away_score: away,
          is_finished: isFinished,
        })
        .eq("id", id);

      if (error) errCount++;
      else okCount++;
    }

    setSaving(false);

    if (okCount > 0) {
      toast.success(`${okCount} partido(s) guardado(s). Puntos recalculados.`);
      // Refrescar
      const { data } = await supabase
        .from("matches")
        .select("id, home_team, away_team, group_name, match_date, home_score, away_score, is_finished")
        .eq("stage", "group")
        .order("group_name", { ascending: true })
        .order("match_date", { ascending: true })
        .order("created_at", { ascending: true });
      if (data) setMatches(data as Match[]);
    }
    if (errCount > 0) toast.error(`${errCount} partido(s) con error`);
  };

  if (loading || isAdmin === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (isAdmin === false) {
    return (
      <AppLayout>
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Acceso denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No tenés permisos de administrador para acceder a esta página.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Panel de Administrador</h1>
            <p className="text-sm text-muted-foreground">
              Cargá los resultados reales de la fase de grupos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirtyIds.length > 0 && (
              <Badge variant="secondary">{dirtyIds.length} cambio(s)</Badge>
            )}
            <Button onClick={handleSaveAll} disabled={saving || dirtyIds.length === 0}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Guardar todos los cambios
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Partidos de fase de grupos ({matches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[60vh] pr-2">
                <div className="space-y-2">
                  {matches.map((m) => {
                    const d = draft[m.id] ?? { home: "", away: "" };
                    const isDirty = dirtyIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-md border ${
                          isDirty ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 sm:w-20">
                          {m.group_name && (
                            <Badge variant="outline" className="text-xs">
                              {m.group_name}
                            </Badge>
                          )}
                          {m.is_finished && (
                            <Badge variant="secondary" className="text-xs">✓</Badge>
                          )}
                        </div>

                        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-right truncate">
                            {m.home_team}
                          </span>
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={d.home}
                              onChange={(e) => handleChange(m.id, "home", e.target.value)}
                              className="w-12 h-9 text-center px-1"
                              placeholder="-"
                            />
                            <span className="text-muted-foreground text-xs">vs</span>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={d.away}
                              onChange={(e) => handleChange(m.id, "away", e.target.value)}
                              className="w-12 h-9 text-center px-1"
                              placeholder="-"
                            />
                          </div>
                          <span className="text-sm font-medium truncate">{m.away_team}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Admin;
