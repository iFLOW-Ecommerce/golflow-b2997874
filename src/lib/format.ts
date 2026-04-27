// Formato de fechas centralizado para evitar duplicación entre páginas.
// Locale es-AR, 24h, día y mes corto + hora:minuto.
export const formatShortDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
};

// Alias semántico para Admin (mismo formato).
export const formatDate = formatShortDate;
