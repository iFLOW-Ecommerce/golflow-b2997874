import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  // SEO básico
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
    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
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
