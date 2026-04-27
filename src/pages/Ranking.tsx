import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Building2, Globe, Star, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendBadge } from "@/lib/trend-badge";
import { UserAvatar } from "@/lib/user-avatar";
import { displayName as fmtName } from "@/lib/display-name";
import heroStadium from "@/assets/hero-ranking.webp";

interface RankingRow {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_seed: string | null;
  team_id: string | null;
  team_name: string | null;
  total_points: number;
  predictions_count: number;
  current_rank: number | null;
  previous_rank: number | null;
  team_current_rank: number | null;
  team_previous_rank: number | null;
}

interface TeamAvatarRow {
  team_avatar_id: string;
  team_id: string;
  name: string;
  total_points: number;
  current_rank: number | null;
  previous_rank: number | null;
}

const GLOBAL = "__global__";
const INTER_AREAS = "__inter_areas__";

const Ranking = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [teamAvatarRows, setTeamAvatarRows] = useState<TeamAvatarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<string>(GLOBAL);
  const [scopeReady, setScopeReady] = useState(false);

  useEffect(() => {
    document.title = "Ranking | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [rankingRes, avatarRes] = await Promise.all([
        supabase
          .from("user_ranking" as any)
          .select("user_id, email, first_name, last_name, avatar_seed, team_id, team_name, total_points, predictions_count, current_rank, previous_rank, team_current_rank, team_previous_rank")
          .order("total_points", { ascending: false })
          .order("email", { ascending: true }),
        supabase
          .from("team_avatars" as any)
          .select("id, team_id, name, team_avatar_ranks(total_points, current_rank, previous_rank)"),
      ]);
      if (!rankingRes.error && rankingRes.data) setRows(rankingRes.data as unknown as RankingRow[]);
      if (!avatarRes.error && avatarRes.data) {
        const mapped: TeamAvatarRow[] = (avatarRes.data as any[]).map((r) => {
          const rank = Array.isArray(r.team_avatar_ranks) ? r.team_avatar_ranks[0] : r.team_avatar_ranks;
          return {
            team_avatar_id: r.id,
            team_id: r.team_id,
            name: r.name,
            total_points: rank?.total_points ?? 0,
            current_rank: rank?.current_rank ?? null,
            previous_rank: rank?.previous_rank ?? null,
          };
        });
        setTeamAvatarRows(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Default scope to user's team once data is loaded
  const myRow = useMemo(() => rows.find((r) => r.user_id === user?.id) ?? null, [rows, user?.id]);
  useEffect(() => {
    if (scopeReady || loading) return;
    if (myRow?.team_id) setScope(myRow.team_id);
    setScopeReady(true);
  }, [loading, myRow, scopeReady]);

  // Build team list (sorted; user's team first)
  const teams = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      if (r.team_id && r.team_name) map.set(r.team_id, r.team_name);
    }
    const arr = Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    arr.sort((a, b) => a.name.localeCompare(b.name));
    if (myRow?.team_id) {
      const idx = arr.findIndex((t) => t.id === myRow.team_id);
      if (idx > 0) {
        const [mine] = arr.splice(idx, 1);
        arr.unshift(mine);
      }
    }
    return arr;
  }, [rows, myRow?.team_id]);

  const isGlobal = scope === GLOBAL;
  const isInterAreas = scope === INTER_AREAS;

  const filtered = useMemo(() => {
    if (isInterAreas) return [];
    if (isGlobal) return rows;
    return rows
      .filter((r) => r.team_id === scope)
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return (a.email ?? "").localeCompare(b.email ?? "");
      });
  }, [rows, scope, isGlobal, isInterAreas]);

  const interAreasSorted = useMemo(() => {
    return [...teamAvatarRows].sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      return a.name.localeCompare(b.name);
    });
  }, [teamAvatarRows]);

  // Compute global and team positions independently of selected scope
  const globalSorted = useMemo(() => rows, [rows]);
  const myGlobalPosition = useMemo(() => {
    const i = globalSorted.findIndex((r) => r.user_id === user?.id);
    return i >= 0 ? i + 1 : null;
  }, [globalSorted, user?.id]);

  const teamSorted = useMemo(() => {
    if (!myRow?.team_id) return [];
    return rows
      .filter((r) => r.team_id === myRow.team_id)
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return (a.email ?? "").localeCompare(b.email ?? "");
      });
  }, [rows, myRow?.team_id]);
  const myTeamPosition = useMemo(() => {
    const i = teamSorted.findIndex((r) => r.user_id === user?.id);
    return i >= 0 ? i + 1 : null;
  }, [teamSorted, user?.id]);

  const scopeLabel = isInterAreas
    ? "Inter Áreas"
    : isGlobal
    ? "Ranking global"
    : `Equipo: ${teams.find((t) => t.id === scope)?.name ?? "—"}`;

  const displayName = (row: RankingRow) => fmtName(row);

  const positionCell = (pos: number) => {
    if (pos === 1)
      return <Trophy className="h-5 w-5 text-yellow-300" fill="currentColor" aria-label="Primero" />;
    if (pos === 2)
      return <Medal className="h-5 w-5 text-slate-300" fill="currentColor" aria-label="Segundo" />;
    if (pos === 3)
      return <Medal className="h-5 w-5 text-amber-600" fill="currentColor" aria-label="Tercero" />;
    return <span className="font-semibold">#{pos}</span>;
  };

  const trendCell = (row: RankingRow) => {
    const current = isGlobal ? row.current_rank : row.team_current_rank;
    const previous = isGlobal ? row.previous_rank : row.team_previous_rank;
    return <TrendBadge current={current} previous={previous} />;
  };

  const rowClassFor = (pos: number, highlight: boolean) => {
    const base: string[] = [];
    if (pos === 1) base.push("bg-yellow-500/10 border-l-4 border-l-yellow-500");
    else if (pos === 2) base.push("bg-slate-400/10 border-l-4 border-l-slate-400");
    else if (pos === 3) base.push("bg-amber-700/10 border-l-4 border-l-amber-700");
    if (highlight) base.push("ring-2 ring-inset ring-primary bg-primary/10 hover:bg-primary/15");
    return cn(...base);
  };

  const otherTeams = myRow?.team_id ? teams.filter((t) => t.id !== myRow.team_id) : teams;
  const myTeam = myRow?.team_id ? teams.find((t) => t.id === myRow.team_id) : null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <section
          className="hero-stadium relative -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6 pt-32 md:pt-48 pb-8 md:pb-10 text-foreground"
          style={{ ["--hero-image" as any]: `url(${heroStadium})` }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-background/40 backdrop-blur border border-primary/60 text-primary"
                style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.55), inset 0 0 8px hsl(var(--primary) / 0.25)" }}
              >
                <BarChart3 className="h-5 w-5" style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.9))" }} />
              </div>
              <span className="inline-flex items-center rounded-full bg-background/50 backdrop-blur px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/30">
                Mundial 2026
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white [text-shadow:_0_2px_12px_rgba(0,0,0,0.85),_0_1px_2px_rgba(0,0,0,0.9)]">
              Ranking
            </h1>
            <p className="inline-block rounded-lg bg-background/55 backdrop-blur-sm px-3 py-1.5 text-base text-white border border-white/10">
              Todos los jugadores ordenados por puntos.
            </p>
          </div>
        </section>

        {myRow && !isInterAreas && (
          <Card className="shadow-card border-primary/30 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tu posición</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border border-t">

              {/* Global */}
              <div className="p-5 bg-gradient-to-br from-background to-secondary/30">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground font-medium">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  <span>Global</span>
                </div>
                {myGlobalPosition ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-foreground">#{myGlobalPosition}</span>
                      <span className="text-sm text-muted-foreground">
                        de <span className="font-semibold text-foreground">{globalSorted.length}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="font-semibold text-foreground">{myRow.total_points} pts</span>
                      <TrendBadge current={myRow.current_rank} previous={myRow.previous_rank} />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Sin posición aún.</p>
                )}
              </div>

              {/* Team */}
              <div className="p-5 bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary font-medium">
                  <Star className="h-3.5 w-3.5" fill="currentColor" />
                  <span className="truncate">Equipo · {myRow.team_name ?? "Sin equipo"}</span>
                </div>
                {myRow.team_id && myTeamPosition ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-primary">#{myTeamPosition}</span>
                      <span className="text-sm text-muted-foreground">
                        de <span className="font-semibold text-foreground">{teamSorted.length}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <TrendBadge current={myRow.team_current_rank} previous={myRow.team_previous_rank} />
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {myRow.team_id ? "Sin posición aún." : "Aún no perteneces a un equipo."}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">{scopeLabel}</CardTitle>
                <CardDescription>
                  {isInterAreas
                    ? "Cada equipo compite con el promedio de puntos de sus miembros por partido."
                    : "Los puntos se actualizan cuando se cargan resultados reales."}
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <Select value={scope} onValueChange={setScope}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elegí un ranking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={GLOBAL}>
                      <span className="inline-flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-primary" />
                        Global
                      </span>
                    </SelectItem>
                    <SelectItem value={INTER_AREAS}>
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        Inter Áreas
                      </span>
                    </SelectItem>
                    {myTeam && (
                      <SelectGroup>
                        <SelectLabel>Mi equipo</SelectLabel>
                        <SelectItem value={myTeam.id}>
                          <span className="inline-flex items-center gap-2">
                            <Star className="h-3.5 w-3.5 text-primary" fill="currentColor" />
                            {myTeam.name}
                          </span>
                        </SelectItem>
                      </SelectGroup>
                    )}
                    {otherTeams.length > 0 && (
                      <SelectGroup>
                        <SelectLabel>Otros equipos</SelectLabel>
                        {otherTeams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : isInterAreas ? (
              interAreasSorted.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Todavía no hay datos en Inter Áreas.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-right">Puntos</TableHead>
                      <TableHead className="w-20 text-center">Tend.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interAreasSorted.map((row, idx) => {
                      const pos = idx + 1;
                      const isMine = !!myRow?.team_id && row.team_id === myRow.team_id;
                      const cleanName = row.name.replace(/^Equipo\s+/i, "").replace(/\s+prom\.?$/i, "").trim() || row.name;
                      return (
                        <TableRow key={row.team_avatar_id} className={rowClassFor(pos, isMine)}>
                          <TableCell>{positionCell(pos)}</TableCell>
                          <TableCell className="truncate max-w-[180px] sm:max-w-none">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <span className={cn("truncate", isMine && "font-semibold")}>{cleanName}</span>
                              {isMine && <Badge variant="secondary" className="text-xs shrink-0">Mi área</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{row.total_points}</TableCell>
                          <TableCell className="text-center">
                            <TrendBadge current={row.current_rank} previous={row.previous_rank} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Todavía no hay jugadores en este ranking.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Usuario</TableHead>
                    {isGlobal && <TableHead>Equipo</TableHead>}
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead className="w-20 text-center">Tend.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row, idx) => {
                    const pos = idx + 1;
                    const isMe = row.user_id === user?.id;
                    const name = displayName(row);
                    return (
                      <TableRow key={row.user_id} className={rowClassFor(pos, isMe)}>
                        <TableCell>{positionCell(pos)}</TableCell>
                        <TableCell className="truncate max-w-[140px] sm:max-w-none">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar seed={row.avatar_seed} name={name} className="h-7 w-7 shrink-0" />
                            <span className={cn("truncate", isMe && "font-semibold")}>{name}</span>
                            {isMe && <Badge variant="secondary" className="text-xs shrink-0">Tú</Badge>}
                          </div>
                        </TableCell>
                        {isGlobal && (
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-[180px]">
                            {row.team_name ?? "—"}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-semibold">{row.total_points}</TableCell>
                        <TableCell className="text-center">{trendCell(row)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Ranking;
