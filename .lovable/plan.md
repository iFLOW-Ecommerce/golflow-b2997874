## Objetivo
En `/admin`, los partidos de fase de grupos no muestran la fecha/hora del partido. Las eliminatorias sí lo hacen porque se renderizan con `showDate: true`. Hay que igualar el comportamiento para grupos.

## Cambio
**Archivo:** `src/pages/Admin.tsx`

- **Línea 398:** cambiar `groupMatches.map((m) => renderScoreRow(m))` por `groupMatches.map((m) => renderScoreRow(m, { showDate: true }))`.

Esto reutiliza la lógica existente de `renderScoreRow` (líneas 280–284) que ya formatea `m.match_date` con `formatDate(...)` y lo muestra junto al nombre de grupo y al multiplicador.

## Consideraciones
- La fecha/hora aparecerá en la columna izquierda junto al chip del grupo (ej: "Grupo A · ⚡×1 · sáb 14 jun 16:00"), truncándose en móvil con `truncate` (ya implementado).
- No se requieren cambios de tipos, datos ni estilos adicionales: el `match_date` ya viene en el query y `formatDate` ya está importado.