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

  useEffect(() => {
    document.title = "Inicio | Prode Mundial 2026";
  }, []);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("predictions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setCompleted(count ?? 0);
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
              <CardDescription>Próximamente: mirá quién va arriba en el torneo.</CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        </section>
      </div>
    </AppLayout>
  );
};

export default Index;
