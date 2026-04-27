import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Copy, Loader2, Search } from "lucide-react";

interface ProfileRow {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
}

export function AdminPasswordResets() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<{
    code: string;
    email: string | null;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("user_id, email, first_name, last_name")
      .order("first_name", { ascending: true })
      .then(({ data }) => setProfiles((data ?? []) as ProfileRow[]));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles.slice(0, 20);
    return profiles
      .filter((p) => {
        const full = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.email ?? ""}`.toLowerCase();
        return full.includes(q);
      })
      .slice(0, 20);
  }, [profiles, query]);

  const selected = profiles.find((p) => p.user_id === selectedId);

  const handleGenerate = async () => {
    if (!selectedId) {
      toast.error("Elegí un usuario primero");
      return;
    }
    setGenerating(true);
    setGeneratedCode(null);
    const { data, error } = await supabase.functions.invoke(
      "admin-generate-reset-code",
      { body: { user_id: selectedId } },
    );
    setGenerating(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? "Error generando código");
      return;
    }
    const result = data as { code: string; email: string | null };
    setGeneratedCode(result);
    toast.success("Código generado. Compartilo de forma segura.");
  };

  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode.code);
    toast.success("Código copiado");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
          Reseteos de clave
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Generá un código temporal (válido 24h, de un solo uso) para que un jugador
          pueda restablecer su contraseña desde la pantalla de ingreso.
        </p>

        <div className="space-y-2">
          <Label>Buscar jugador</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nombre, apellido o email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1 max-h-56 overflow-y-auto rounded-md border border-border">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3">Sin resultados</p>
          ) : (
            filtered.map((p) => {
              const isSel = p.user_id === selectedId;
              const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(sin nombre)";
              return (
                <button
                  key={p.user_id}
                  type="button"
                  onClick={() => setSelectedId(p.user_id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    isSel ? "bg-primary/10 text-foreground" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{p.email}</div>
                </button>
              );
            })
          )}
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!selectedId || generating}
          variant="hero"
          className="w-full"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          Generar código de reseteo
        </Button>

        {selected && !generatedCode && (
          <p className="text-xs text-muted-foreground">
            Generarás un código para <span className="font-medium text-foreground">{selected.email}</span>
          </p>
        )}

        {generatedCode && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="secondary">Código de reseteo</Badge>
              <span className="text-xs text-muted-foreground">{generatedCode.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-2xl font-mono font-bold tracking-widest text-center py-3 rounded-md bg-background border border-border">
                {generatedCode.code}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este código se muestra <strong>una sola vez</strong>. Compartilo con el jugador
              por un canal seguro (en persona, WhatsApp). Vence en 24 horas y solo puede
              usarse una vez.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
