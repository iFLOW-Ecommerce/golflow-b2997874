import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Target, BarChart3 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const TOTAL_GROUP_MATCHES = 48;

const Index = () => {
  const { user } = useAuth();
  const [completed, setCompleted] = useState<number | null>(null);
  const [myPosition, setMyPosition] = useState<number | null>(null);
  const [myPoints, setMyPoints] = useState<number>(0);

  useEffect(() => {
    document.title = "Inicio | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ count }, ranking] = await Promise.all([
        supabase
          .from("predictions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("user_ranking" as any)
          .select("user_id, total_points")
          .order("total_points", { ascending: false }),
      ]);
      setCompleted(count ?? 0);
      const rows = (ranking.data ?? []) as Array<{ user_id: string; total_points: number }>;
      const idx = rows.findIndex((r) => r.user_id === user.id);
      if (idx >= 0) {
        setMyPosition(idx + 1);
        setMyPoints(rows[idx].total_points ?? 0);
      } else {
        setMyPosition(null);
        setMyPoints(0);
      }
    };
    load();
  }, [user]);

  const done = completed ?? 0;
  const percent = Math.round((done / TOTAL_GROUP_MATCHES) * 100);

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
      </div>
    </AppLayout>
  );
};

export default Index;
