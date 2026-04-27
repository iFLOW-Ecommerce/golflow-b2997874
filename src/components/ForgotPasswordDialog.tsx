import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

export function ForgotPasswordDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        title: "Clave muy corta",
        description: "Mínimo 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Las claves no coinciden",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke(
      "reset-password-with-code",
      {
        body: {
          email: email.trim(),
          code: code.trim().toUpperCase(),
          new_password: newPassword,
        },
      },
    );
    setSubmitting(false);
    const errMsg = (data as { error?: string })?.error ?? error?.message;
    if (errMsg) {
      toast({
        title: "No pudimos resetear",
        description: errMsg,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Clave actualizada",
      description: "Ya podés ingresar con tu nueva contraseña.",
    });
    setOpen(false);
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu clave?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
            Restablecer clave
          </DialogTitle>
          <DialogDescription>
            Pedile a un administrador que te genere un código de reseteo.
            Después ingresalo acá junto con tu nueva clave.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-code">Código de reseteo</Label>
            <Input
              id="reset-code"
              type="text"
              required
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="8 caracteres"
              className="font-mono tracking-widest text-center"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-new">Nueva clave</Label>
            <Input
              id="reset-new"
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm">Confirmar clave</Label>
            <Input
              id="reset-confirm"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí la clave"
            />
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
            {submitting ? "Actualizando..." : "Actualizar clave"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
