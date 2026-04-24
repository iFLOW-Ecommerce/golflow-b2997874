import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { avatarUrl } from "@/lib/user-avatar";
import { cn } from "@/lib/utils";

type Team = { id: string; name: string };

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Signup-only state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [teamId, setTeamId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const generateBase = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const [avatarBase, setAvatarBase] = useState(generateBase);
  const avatarSeeds = useMemo(
    () => Array.from({ length: 8 }, (_, i) => `${avatarBase}-${i + 1}`),
    [avatarBase],
  );
  const [selectedSeed, setSelectedSeed] = useState<string>(avatarSeeds[0]);

  useEffect(() => {
    setSelectedSeed(avatarSeeds[0]);
  }, [avatarSeeds]);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    document.title = "Iniciar sesión | Prode Mundial 2026";
    const desc = document.querySelector('meta[name="description"]');
    const content = "Ingresá o registrate en Prode Mundial 2026 y predecí los resultados.";
    if (desc) desc.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => setTeams((data ?? []) as Team[]));
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({
        title: "No pudimos iniciar sesión",
        description: error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos."
          : error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !teamId || !selectedSeed) {
      toast({
        title: "Faltan datos",
        description: "Completá nombre, apellido, equipo y elegí un avatar.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          team_id: teamId,
          avatar_seed: selectedSeed,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "No pudimos crear la cuenta",
        description: error.message.includes("already registered")
          ? "Este email ya está registrado. Iniciá sesión."
          : error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "¡Cuenta creada!", description: "Ya podés empezar a predecir." });
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center space-y-3">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl shadow-elegant bg-card border border-border overflow-hidden">
            <img src={logo} alt="Prode Mundial 2026" className="h-20 w-20 object-contain" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Prode Mundial 2026
          </h1>
          <p className="text-sm text-muted-foreground">
            Predecí los resultados y competí con tus amigos
          </p>
        </header>

        <Card className="shadow-elegant border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Acceder</CardTitle>
            <CardDescription>Entrá con tu cuenta o creá una nueva</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="signin">Ingresar</TabsTrigger>
                <TabsTrigger value="signup">Registrarme</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" required autoComplete="email"
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <Input id="signin-password" type="password" required autoComplete="current-password"
                      value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                    {submitting ? "Ingresando..." : "Ingresar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-first">Nombre</Label>
                      <Input id="signup-first" type="text" required autoComplete="given-name"
                        value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Juan" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-last">Apellido</Label>
                      <Input id="signup-last" type="text" required autoComplete="family-name"
                        value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Pérez" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-team">Equipo</Label>
                    <Select value={teamId} onValueChange={setTeamId}>
                      <SelectTrigger id="signup-team">
                        <SelectValue placeholder="Elegí tu equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Elegí tu avatar</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {avatarSeeds.map((seed) => {
                        const isSel = seed === selectedSeed;
                        return (
                          <button
                            key={seed}
                            type="button"
                            onClick={() => setSelectedSeed(seed)}
                            aria-label="Elegir avatar"
                            aria-pressed={isSel}
                            className={cn(
                              "aspect-square rounded-lg border-2 bg-muted overflow-hidden transition-all",
                              isSel
                                ? "border-primary ring-2 ring-primary/40 scale-105"
                                : "border-border hover:border-primary/50",
                            )}
                          >
                            <img
                              src={avatarUrl(seed)}
                              alt="avatar"
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" required autoComplete="email"
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input id="signup-password" type="password" required autoComplete="new-password" minLength={6}
                      value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
                    {submitting ? "Creando cuenta..." : "Crear cuenta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Auth;
