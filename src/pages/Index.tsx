import { useEffect } from "react";
import { Trophy, Target, BarChart3 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Inicio | Prode Mundial 2026";
  }, []);

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
              <CardDescription>Próximamente: cargá tus pronósticos partido a partido.</CardDescription>
            </CardHeader>
            <CardContent />
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
