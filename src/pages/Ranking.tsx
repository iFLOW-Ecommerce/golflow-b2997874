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

interface RankingRow {
  user_id: string;
  email: string | null;
  total_points: number;
  predictions_count: number;
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
        .select("user_id, email, total_points, predictions_count")
        .order("total_points", { ascending: false })
        .order("email", { ascending: true })
        .limit(100);
      if (!error && data) setRows(data as unknown as RankingRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const top = rows.slice(0, 20);
  const myIndex = rows.findIndex((r) => r.user_id === user?.id);
  const me = myIndex >= 0 ? rows[myIndex] : null;
  const myPosition = myIndex >= 0 ? myIndex + 1 : null;
  const meInTop = myPosition !== null && myPosition <= 20;

  const displayName = (email: string | null) =>
    email ? email.split("@")[0] : "Usuario";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Ranking</h1>
            <p className="text-sm text-muted-foreground">Top 20 de jugadores por puntos totales.</p>
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
            <CardTitle className="text-base">Top 20</CardTitle>
            <CardDescription>Los puntos se actualizan cuando se cargan resultados reales.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : top.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Todavía no hay jugadores en el ranking.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top.map((row, idx) => {
                    const pos = idx + 1;
                    const isMe = row.user_id === user?.id;
                    return (
                      <TableRow
                        key={row.user_id}
                        className={cn(isMe && "bg-primary/10 hover:bg-primary/15")}
                      >
                        <TableCell className="font-semibold">#{pos}</TableCell>
                        <TableCell className="truncate max-w-[180px] sm:max-w-none">
                          <div className="flex items-center gap-2">
                            <span className={cn(isMe && "font-semibold")}>{displayName(row.email)}</span>
                            {isMe && <Badge variant="secondary" className="text-xs">Tú</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{row.total_points}</TableCell>
                      </TableRow>
                    );
                  })}
                  {me && !meInTop && myPosition && (
                    <TableRow className="bg-primary/10 hover:bg-primary/15 border-t-2">
                      <TableCell className="font-semibold">#{myPosition}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{displayName(me.email)}</span>
                          <Badge variant="secondary" className="text-xs">Tú</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{me.total_points}</TableCell>
                    </TableRow>
                  )}
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
