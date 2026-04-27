## Diagnóstico

Detecté **6 causas** que generan scroll lateral, cards de anchos distintos y sectores vacíos en mobile:

### 1. `src/App.css` — residuo del template Vite (causa raíz crítica)
`#root` tiene `max-width: 1280px`, `padding: 2rem` (32px en cada lado, fuera del control de Tailwind) y `text-align: center`. Esto:
- Suma padding extra que empuja el contenido fuera del viewport en mobile (overflow horizontal global).
- Limita el ancho del hero en pantallas grandes (problema reportado anteriormente).
- Centra texto donde no debería.

### 2. `/inicio` — Lista "Próximos partidos" no quepa en mobile
Cada `<li>` tiene fecha (w-28 = 112px) + equipos + countdown + botón "Cargar resultados" todos con `shrink-0`. Suma >360px → scroll horizontal dentro de la card.

### 3. `/inicio` — Stats del hero con ancho fijo
`md:w-[200px]` sobre el bloque de ranking + items de la lista de ranking (pts inline + TrendBadge) desbordan en pantallas <380px.

### 4. `/prediccion` — Filas de partidos con anchos rígidos
`sm:w-40` (160px) en nombres de equipos × 2 + inputs (~110px) + status (`sm:w-28` = 112px) = ~542px. En tablets de 600-700px se desborda.

### 5. `/ranking` — Tabla sin wrapper de scroll
La `<Table>` puede desbordar la card en mobile (nombres largos + badges + trend). Falta `overflow-x-auto` defensivo.

### 6. `min-w-0` faltante en cadenas flex
Varios contenedores flex padre no propagan `min-w-0`, lo que rompe `truncate` interno y permite que el texto empuje el ancho.

---

## Cambios propuestos

### A. `src/App.css` — limpieza global
Reemplazar todo el contenido por un archivo vacío (o solo con un comentario). Esto elimina:
- `max-width: 1280px` en `#root` (deja que el layout de Tailwind controle el ancho).
- `padding: 2rem` (el `<main>` ya tiene `p-4 md:p-6`).
- `text-align: center` (rompe alineaciones).
- Estilos `.logo`, `.card`, `.read-the-docs` no usados.

**Beneficio adicional:** soluciona también el problema previo de hero recortado en pantallas grandes.

### B. `src/pages/Index.tsx` — Card "Próximos partidos"
Reestructurar cada `<li>` para que en mobile use **layout en 2 filas** (fila 1: fecha + equipos; fila 2: countdown + botón) y solo en `sm:` mantenga la fila única horizontal:
- Cambiar `<li className="flex items-center gap-3 ...">` por `<li className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ...">`.
- Ocultar la fecha vieja `w-28` en mobile y mostrarla como prefijo del equipo (texto pequeño arriba).
- El botón "Cargar resultados" / "Modificar" pasa a `w-full sm:w-auto` en mobile.

### C. `src/pages/Index.tsx` — Hero stats
- Cambiar `md:w-[200px]` por `md:w-[220px]` y agregar `min-w-0` al contenedor padre del hero grid.
- En la lista de ranking interna, envolver el bloque de "pts + TrendBadge" para que pueda hacer wrap si no entra: `flex-wrap` en el contenedor `<span>` exterior.

### D. `src/pages/Prediccion.tsx` — Filas de partidos
- Reducir `sm:w-40` a `sm:w-32` (128px) en los nombres de equipos.
- Cambiar `sm:w-28` del status a `sm:w-auto` con `sm:min-w-[7rem]`.
- Mantener layout de columna en mobile (ya está bien con `flex-col sm:flex-row`), pero asegurar `min-w-0` en el flex parent para que `truncate` funcione.

### E. `src/pages/Ranking.tsx` — Tabla con scroll defensivo
Envolver la `<Table>` en `<div className="overflow-x-auto -mx-6">` dentro de `CardContent` para permitir scroll lateral solo dentro de la tabla si hace falta, sin romper el resto de la página. Ajustar también el `max-w-[200px]` del nombre a `max-w-[140px] sm:max-w-none` para evitar overflow.

### F. Hero — defensa de overflow
Agregar `overflow-hidden` al wrapper exterior del hero en las 3 páginas (Index, Prediccion, Ranking) para contener cualquier elemento que se exceda visualmente sin romper el viewport.

### G. `src/components/AppLayout.tsx` — wrapper del main
Agregar `overflow-x-hidden` al contenedor `<main>` o al `<div className="flex-1 flex flex-col min-w-0">` para garantizar que ningún hijo pueda forzar scroll horizontal de página completa.

---

## Archivos a modificar
- `src/App.css` (limpiar todo el contenido)
- `src/components/AppLayout.tsx` (overflow-x-hidden + min-w-0)
- `src/pages/Index.tsx` (lista de próximos partidos + hero stats)
- `src/pages/Prediccion.tsx` (anchos de filas de partidos)
- `src/pages/Ranking.tsx` (wrapper scroll en tabla + truncate names)

## QA esperado
Verificar a 360px, 390px, 414px y 768px que:
- No hay scroll horizontal de página.
- Las cards ocupan el mismo ancho (no quedan más anchas que otras).
- No quedan sectores vacíos a los costados.
- El hero ocupa el ancho completo del viewport (sin caja 1280px).
- Las tablas/listas internas pueden hacer scroll lateral solo si su contenido lo requiere, sin afectar la página.