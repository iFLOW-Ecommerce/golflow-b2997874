import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Trophy, Target, Goal, Zap, Lightbulb } from "lucide-react";

interface RulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showDontShowAgain?: boolean;
  onDismissForever?: () => void;
}

export const RulesDialog = ({
  open,
  onOpenChange,
  showDontShowAgain = false,
  onDismissForever,
}: RulesDialogProps) => {
  const [dontShow, setDontShow] = useState(false);

  useEffect(() => {
    if (open) setDontShow(false);
  }, [open]);

  const handleClose = () => {
    if (showDontShowAgain && dontShow && onDismissForever) {
      onDismissForever();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent hideClose className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="h-6 w-6 text-primary" />
            Reglas del juego
          </DialogTitle>
          <DialogDescription>
            Predicciones del Mundial FIFA 2026. Acertá los resultados y sumá la mayor cantidad de puntos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cierre */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4 pb-4 flex gap-3">
              <Clock className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Cierre de predicciones</h3>
                <p className="text-sm text-muted-foreground">
                  Podés cargar o modificar tus resultados hasta <strong>1 hora antes</strong> de cada partido.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Cómo sumar puntos */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Goal className="h-5 w-5 text-primary" />
              Cómo sumás puntos
            </h3>
            <div className="grid sm:grid-cols-3 gap-2">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-primary">+3</div>
                  <div className="text-xs font-medium mt-1">Acertar ganador</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Si se define por penales, cuenta como empate
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-primary">+2</div>
                  <div className="text-xs font-medium mt-1">Resultado exacto</div>
                  <div className="text-[11px] text-muted-foreground mt-1">Marcador idéntico</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="text-2xl font-bold text-primary">+1</div>
                  <div className="text-xs font-medium mt-1">Por gol del partido</div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Un 0–0 cuenta como 1 punto
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Ejemplos */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Ejemplos
            </h3>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-3 py-2">Resultado</th>
                    <th className="text-left px-3 py-2">Cálculo</th>
                    <th className="text-right px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-3 py-2 font-mono">0 – 0</td>
                    <td className="px-3 py-2 text-muted-foreground">3 + 2 + 1</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">6 pts</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">1 – 0</td>
                    <td className="px-3 py-2 text-muted-foreground">3 + 2 + 1</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">6 pts</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono">5 – 4</td>
                    <td className="px-3 py-2 text-muted-foreground">3 + 2 + 9</td>
                    <td className="px-3 py-2 text-right font-bold text-primary">14 pts</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Multiplicadores */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-4 flex gap-3">
              <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" fill="currentColor" />
              <div>
                <h3 className="font-semibold mb-1">Multiplicadores en eliminatorias</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Desde octavos de final, los puntos se multiplican. ¡Cuanto más cerca de la final, más valen!
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">Octavos ⚡×2</span>
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">Cuartos ⚡×3</span>
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">Semis ⚡×4</span>
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5">Final ⚡×5</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {showDontShowAgain ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="dont-show-rules"
                checked={dontShow}
                onCheckedChange={(c) => setDontShow(c === true)}
              />
              <Label htmlFor="dont-show-rules" className="text-sm cursor-pointer">
                No volver a mostrar al inicio
              </Label>
            </div>
          ) : (
            <div />
          )}
          <Button onClick={handleClose}>
            <Target className="h-4 w-4" />
            ¡A jugar!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
