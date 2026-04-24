import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendBadge } from "@/lib/trend-badge";
import { UserAvatar } from "@/lib/user-avatar";
import { displayName as fmtName } from "@/lib/display-name";

interface RankingRow {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_seed: string | null;
  team_name: string | null;
  total_points: number;
  predictions_count: number;
  current_rank: number | null;
  previous_rank: number | null;
}

const Ranking = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Ranking | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_ranking" as any)
        .select("user_id, email, first_name, last_name, avatar_seed, team_name, total_points, predictions_count, current_rank, previous_rank")
        .order("total_points", { ascending: false })
        .order("email", { ascending: true });
      if (!error && data) setRows(data as unknown as RankingRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const myIndex = rows.findIndex((r) => r.user_id === user?.id);
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const myPosition = myIndex >= 0 ? myIndex + 1 : null;

  const displayName = (row: RankingRow) => fmtName(row);

  const positionCell = (pos: number) => {
    if (pos === 1) return <span className="text-xl" aria-label="Primero">🥇</span>;
    if (pos === 2) return <span className="text-xl" aria-label="Segundo">🥈</span>;
    if (pos === 3) return <span className="text-xl" aria-label="Tercero">🥉</span>;
    return <span className="font-semibold">#{pos}</span>;
  };

  const trendCell = (current: number | null, previous: number | null) => (
    <TrendBadge current={current} previous={previous} />
  );

  const rowClassFor = (pos: number, isMe: boolean) => {
    const base: string[] = [];
    if (pos === 1) base.push("bg-yellow-500/10 border-l-4 border-l-yellow-500");
    else if (pos === 2) base.push("bg-slate-400/10 border-l-4 border-l-slate-400");
    else if (pos === 3) base.push("bg-amber-700/10 border-l-4 border-l-amber-700");
    if (isMe) base.push("ring-2 ring-inset ring-primary bg-primary/10 hover:bg-primary/15");
    return cn(...base);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ranking</h1>
            <p className="text-sm text-muted-foreground">Todos los jugadores ordenados por puntos.</p>
          </div>
        </div>

        {me && (
          <Card className="shadow-card border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tu posición</CardTitle>
              <CardDescription>
                {myPosition ? (
                  <>
                    Estás en el puesto <span className="font-semibold text-foreground">#{myPosition}</span>{" "}
                    con <span className="font-semibold text-foreground">{me.total_points}</span> puntos.
                  </>
                ) : (
                  "Aún no apareces en el ranking."
                )}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Clasificación general</CardTitle>
            <CardDescription>Los puntos se actualizan cuando se cargan resultados reales.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Todavía no hay jugadores en el ranking.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="hidden sm:table-cell">Equipo</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead className="w-20 text-center">Tend.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => {
                    const pos = idx + 1;
                    const isMe = row.user_id === user?.id;
                    const name = displayName(row);
                    return (
                      <TableRow key={row.user_id} className={rowClassFor(pos, isMe)}>
                        <TableCell>{positionCell(pos)}</TableCell>
                        <TableCell className="truncate max-w-[200px] sm:max-w-none">
                          <div className="flex items-center gap-2 min-w-0">
                            <UserAvatar seed={row.avatar_seed} name={name} className="h-7 w-7 shrink-0" />
                            <span className={cn("truncate", isMe && "font-semibold")}>{name}</span>
                            {isMe && <Badge variant="secondary" className="text-xs shrink-0">Tú</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground truncate max-w-[180px]">
                          {row.team_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{row.total_points}</TableCell>
                        <TableCell className="text-center">
                          {trendCell(row.current_rank, row.previous_rank)}
                        </TableCell>
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
