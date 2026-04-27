// Etapas de eliminatorias con su label en castellano.
// Usado en Admin y Predicción para evitar duplicar la lista.
export const KO_STAGES: { key: string; label: string }[] = [
  { key: "round_of_32", label: "Dieciseisavos" },
  { key: "round_of_16", label: "Octavos" },
  { key: "quarterfinal", label: "Cuartos" },
  { key: "semifinal", label: "Semifinales" },
  { key: "third_place", label: "Tercer puesto" },
  { key: "final", label: "Final" },
];

// Bloqueo de predicciones: 1h antes del horario del partido.
export const LOCK_MS = 60 * 60 * 1000;
