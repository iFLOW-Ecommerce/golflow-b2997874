import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, ShieldAlert } from "lucide-react";
import { MultiplierBadge } from "@/lib/multiplier";
import { TeamName } from "@/lib/country-flag";

interface Match {
  id: string;
  stage: string;
  home_team: string;
  away_team: string;
  group_name: string | null;
  match_date: string;
  home_score: number | null;
  away_score: number | null;
  is_finished: boolean;
}

type ScoreDraft = Record<string, { home: string; away: string }>;
type TeamDraft = Record<string, { home: string; away: string }>;

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

const Admin = () => {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({});
  const [teamDraft, setTeamDraft] = useState<TeamDraft>({});
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTeams, setSavingTeams] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data?.is_admin));
  }, [user]);

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from("matches")
      .select("id, stage, home_team, away_team, group_name, match_date, home_score, away_score, is_finished")
      .order("match_date", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Error cargando partidos");
      return;
    }
    const list = (data ?? []) as Match[];
    setMatches(list);
    const sDraft: ScoreDraft = {};
    const tDraft: TeamDraft = {};
    for (const m of list) {
      sDraft[m.id] = {
        home: m.home_score?.toString() ?? "",
        away: m.away_score?.toString() ?? "",
      };
      tDraft[m.id] = { home: m.home_team, away: m.away_team };
    }
    setScoreDraft(sDraft);
    setTeamDraft(tDraft);
  };

  useEffect(() => {
    if (isAdmin !== true) return;
    setLoadingData(true);
    loadMatches().finally(() => setLoadingData(false));
  }, [isAdmin]);

  const groupMatches = useMemo(
    () => matches.filter((m) => m.stage === "group"),
    [matches],
  );
  const koMatches = useMemo(
    () => matches.filter((m) => m.stage !== "group"),
    [matches],
  );
  const koByStage = useMemo(() => {
    const map: Record<string, Match[]> = {};
    koMatches.forEach((m) => {
      (map[m.stage] ||= []).push(m);
    });
    return map;
  }, [koMatches]);

  const dirtyScoreIds = useMemo(() => {
    return matches
      .filter((m) => {
        const d = scoreDraft[m.id];
        if (!d) return false;
        const oh = m.home_score?.toString() ?? "";
        const oa = m.away_score?.toString() ?? "";
        return d.home !== oh || d.away !== oa;
      })
      .map((m) => m.id);
  }, [matches, scoreDraft]);

  const dirtyTeamIds = useMemo(() => {
    return koMatches
      .filter((m) => {
        const d = teamDraft[m.id];
        if (!d) return false;
        return d.home !== m.home_team || d.away !== m.away_team;
      })
      .map((m) => m.id);
  }, [koMatches, teamDraft]);

  const handleScoreChange = (id: string, side: "home" | "away", value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setScoreDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [side]: value },
    }));
  };

  const handleTeamChange = (id: string, side: "home" | "away", value: string) => {
    setTeamDraft((prev) => ({
      ...prev,
      [id]: { ...prev[id], [side]: value },
    }));
  };

  const handleSaveScores = async (ids: string[]) => {
    if (ids.length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }
    setSaving(true);
    // Snapshot current_rank -> previous_rank BEFORE any points/ranks change
    await supabase.rpc("snapshot_user_ranks" as any);
    await supabase.rpc("snapshot_team_ranks" as any);
    await supabase.rpc("snapshot_team_avatar_ranks" as any);
    let okCount = 0;
    let errCount = 0;
    for (const id of ids) {
      const d = scoreDraft[id];
      const home = d.home === "" ? null : parseInt(d.home, 10);
      const away = d.away === "" ? null : parseInt(d.away, 10);
      const isFinished = home !== null && away !== null;
      const { error } = await supabase
        .from("matches")
        .update({ home_score: home, away_score: away, is_finished: isFinished })
        .eq("id", id);
      if (error) errCount++;
      else okCount++;
    }
    if (okCount > 0) {
      // Recompute current_rank with the new points
      await supabase.rpc("recalculate_user_ranks" as any);
      await supabase.rpc("recalculate_team_ranks" as any);
      await supabase.rpc("recalculate_achievements" as any);
      await supabase.rpc("recalculate_team_avatar_points" as any);
      await supabase.rpc("recalculate_team_avatar_ranks" as any);
    }
    setSaving(false);
    if (okCount > 0) {
      toast.success(`${okCount} resultado(s) guardado(s). Puntos y ranking recalculados.`);
      await loadMatches();
    }
    if (errCount > 0) toast.error(`${errCount} con error`);
  };

  const handleSaveTeams = async () => {
    if (dirtyTeamIds.length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }
    setSavingTeams(true);
    let okCount = 0;
    let errCount = 0;
    for (const id of dirtyTeamIds) {
      const d = teamDraft[id];
      const home = d.home.trim() || "Por definir";
      const away = d.away.trim() || "Por definir";
      const { error } = await supabase
        .from("matches")
        .update({ home_team: home, away_team: away })
        .eq("id", id);
      if (error) errCount++;
      else okCount++;
    }
    setSavingTeams(false);
    if (okCount > 0) {
      toast.success(`${okCount} equipo(s) actualizado(s).`);
      await loadMatches();
    }
    if (errCount > 0) toast.error(`${errCount} con error`);
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

  const dirtyGroupScoreIds = dirtyScoreIds.filter((id) =>
    groupMatches.find((m) => m.id === id),
  );
  const dirtyKoScoreIds = dirtyScoreIds.filter((id) =>
    koMatches.find((m) => m.id === id),
  );

  const renderScoreRow = (m: Match, opts?: { showDate?: boolean }) => {
    const d = scoreDraft[m.id] ?? { home: "", away: "" };
    const isDirty = dirtyScoreIds.includes(m.id);
    return (
      <div
        key={m.id}
        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-md border ${
          isDirty ? "border-primary bg-primary/5" : "border-border bg-card"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 sm:w-32">
          {m.group_name && (
            <Badge variant="outline" className="text-xs">{m.group_name}</Badge>
          )}
          <MultiplierBadge stage={m.stage} />
          {opts?.showDate && (
            <span className="text-xs text-muted-foreground truncate">
              {formatDate(m.match_date)}
            </span>
          )}
          {m.is_finished && <Badge variant="secondary" className="text-xs">✓</Badge>}
        </div>
        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-right truncate">
            <TeamName name={m.home_team} flagSize={14} className="justify-end" />
          </span>
          <div className="flex items-center gap-1">
            <Input
              type="text"
              inputMode="numeric"
              value={d.home}
              onChange={(e) => handleScoreChange(m.id, "home", e.target.value)}
              className="w-12 h-9 text-center px-1"
              placeholder="-"
            />
            <span className="text-muted-foreground text-xs">vs</span>
            <Input
              type="text"
              inputMode="numeric"
              value={d.away}
              onChange={(e) => handleScoreChange(m.id, "away", e.target.value)}
              className="w-12 h-9 text-center px-1"
              placeholder="-"
            />
          </div>
          <span className="text-sm font-medium truncate">
            <TeamName name={m.away_team} flagSize={14} />
          </span>
        </div>
      </div>
    );
  };

  const renderTeamRow = (m: Match) => {
    const d = teamDraft[m.id] ?? { home: m.home_team, away: m.away_team };
    const isDirty = dirtyTeamIds.includes(m.id);
    return (
      <div
        key={m.id}
        className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md border ${
          isDirty ? "border-primary bg-primary/5" : "border-border bg-card"
        }`}
      >
        <div className="flex items-center gap-2 sm:w-32">
          <span className="text-xs text-muted-foreground truncate">
            {formatDate(m.match_date)}
          </span>
          <MultiplierBadge stage={m.stage} />
        </div>
        <div className="flex-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-w-0">
          <Input
            value={d.home}
            onChange={(e) => handleTeamChange(m.id, "home", e.target.value)}
            placeholder="🇦🇷 Argentina"
            className="h-9"
          />
          <span className="text-muted-foreground text-xs">vs</span>
          <Input
            value={d.away}
            onChange={(e) => handleTeamChange(m.id, "away", e.target.value)}
            placeholder="🇫🇷 Francia"
            className="h-9"
          />
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Panel de Administrador</h1>
          <p className="text-sm text-muted-foreground">
            Cargá resultados reales y asigná equipos a las eliminatorias.
          </p>
        </div>

        <Tabs defaultValue="grupos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grupos">Fase de grupos</TabsTrigger>
            <TabsTrigger value="eliminatorias">Eliminatorias</TabsTrigger>
          </TabsList>

          <TabsContent value="grupos" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Partidos de grupos ({groupMatches.length})</CardTitle>
                <div className="flex items-center gap-2">
                  {dirtyGroupScoreIds.length > 0 && (
                    <Badge variant="secondary">{dirtyGroupScoreIds.length}</Badge>
                  )}
                  <Button
                    onClick={() => handleSaveScores(dirtyGroupScoreIds)}
                    disabled={saving || dirtyGroupScoreIds.length === 0}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[60vh] pr-2">
                    <div className="space-y-2">
                      {groupMatches.map((m) => renderScoreRow(m))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="eliminatorias" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Asignar equipos ({koMatches.length} slots)</CardTitle>
                <div className="flex items-center gap-2">
                  {dirtyTeamIds.length > 0 && (
                    <Badge variant="secondary">{dirtyTeamIds.length}</Badge>
                  )}
                  <Button
                    onClick={handleSaveTeams}
                    disabled={savingTeams || dirtyTeamIds.length === 0}
                  >
                    {savingTeams ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar equipos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[40vh] pr-2">
                    <div className="space-y-4">
                      {KO_STAGES.map((s) => {
                        const list = koByStage[s.key] ?? [];
                        if (list.length === 0) return null;
                        return (
                          <div key={s.key} className="space-y-2">
                            <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                            <div className="space-y-2">
                              {list.map((m) => renderTeamRow(m))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Resultados reales eliminatorias</CardTitle>
                <div className="flex items-center gap-2">
                  {dirtyKoScoreIds.length > 0 && (
                    <Badge variant="secondary">{dirtyKoScoreIds.length}</Badge>
                  )}
                  <Button
                    onClick={() => handleSaveScores(dirtyKoScoreIds)}
                    disabled={saving || dirtyKoScoreIds.length === 0}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar resultados
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[40vh] pr-2">
                    <div className="space-y-4">
                      {KO_STAGES.map((s) => {
                        const list = koByStage[s.key] ?? [];
                        if (list.length === 0) return null;
                        return (
                          <div key={s.key} className="space-y-2">
                            <h3 className="text-sm font-semibold text-foreground">{s.label}</h3>
                            <div className="space-y-2">
                              {list.map((m) => renderScoreRow(m, { showDate: true }))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
