import { useEffect, useState, type ReactNode } from "react";

// Componente aislado para el countdown del Mundial.
// Re-renderiza solo a sí mismo (no a la página entera) cada segundo.
interface Props {
  /** Función que recibe `now` (ms) y devuelve el contenido a renderizar. */
  children: (now: number) => ReactNode;
  /** Intervalo de actualización en ms (default: 1000). */
  intervalMs?: number;
}

export function CountdownTicker({ children, intervalMs = 1000 }: Props) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return <>{children(now)}</>;
}
