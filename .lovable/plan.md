## Cambios en `src/pages/Index.tsx` — Card "Próximos partidos"

Tres mejoras en la lista de próximos partidos del Inicio. **Sin cambios de DB.**

---

### 1) Botón "🪔 Predecir Automáticamente" (arriba a la derecha de la card)

- Ubicación: en el `CardHeader`, alineado a la derecha del título.
- Visible solo si hay al menos 1 partido pendiente de predecir entre los próximos mostrados (y dentro de fecha límite).
- Al hacer click:
  - Detecta los partidos de `upcoming` que **no tienen predicción** y **no están bloqueados** (misma regla que `Prediccion.tsx`: `Date.now() < match_date - 1h`).
  - Genera un marcador aleatorio realista por partido con la siguiente distribución de goles por equipo (ponderada hacia menos goles, máximo 3):
    - 0 → 35%, 1 → 35%, 2 → 20%, 3 → 10%
  - Hace un `supabase.from("predictions").insert([...])` en bloque con `user_id` del usuario.
  - Actualiza el state local `predsByMatch` con las nuevas predicciones para refrescar la UI sin recargar.
  - Muestra `toast` de éxito ("Se completaron N predicciones") o de error.
- Estilo: `Button` `size="sm"` `variant="outline"` con el ícono 🪔. Se deshabilita mientras se está guardando (`isAutoPredicting`).
- Si no hay partidos pendientes (todos predichos o todos bloqueados), el botón no se renderiza.

### 2) Temporizador en lugar de "– –" + reloj

- Reemplaza el texto "– –" actual cuando no hay predicción por un **countdown en vivo** al `match_date - 1h` (deadline real).
- Formato:
  - `> 1 día`: muestra `Nd Nh` (ej. "3d 5h") en color `text-muted-foreground` (gris).
  - `≤ 1 día y > 4h`: muestra `Nh Nm` en color naranja (`text-orange-500`).
  - `≤ 4h`: muestra `Nh Nm Ns` en color rojo (`text-destructive`), con segundos en vivo.
  - `≤ 0`: muestra "Cerrado" en gris.
- Implementación: un `useState` `now` actualizado por `setInterval(() => setNow(Date.now()), 1000)` montado en el componente; los partidos derivan su display de `now`. Para no actualizar cada segundo cuando faltan días, el intervalo siempre corre 1s pero solo recalcula strings (es barato para 5 filas).

### 3) Botón a la derecha de cada fila

Reemplaza la columna actual de "Tu predicción: X-Y" / link "– –" por un patrón fila + botón:
- **Sin predicción:** `Button size="sm"` con clase verde tema (`bg-primary text-primary-foreground hover:bg-primary/90`) con texto "Cargar resultados", `asChild` envolviendo `<Link to={\`/prediccion?match=${m.id}\`}>`.
- **Con predicción:** se sigue mostrando el marcador "Tu predicción: H-A" a la izquierda del botón, y el botón pasa a `Button size="sm" variant="ghost"` (menos destacado) con texto "Modificar" → mismo `Link` a `/prediccion?match=${m.id}`.
- **Si está cerrado** (`now >= match_date - 1h`) y no hay predicción: el botón se deshabilita ("Cerrado") sin link.

---

### Detalles de implementación

- Import adicional: `useToast` desde `@/hooks/use-toast`.
- Constante local `LOCK_MS = 60*60*1000` (replicada de `Prediccion.tsx`).
- Helper `randomScore()` con la distribución ponderada arriba.
- Helper `formatCountdown(msRemaining)` que devuelve `{ text, tone: 'gray' | 'orange' | 'red' | 'closed' }`.
- El temporizador se monta solo si `upcoming.length > 0` para evitar el interval innecesario.
- No se modifica la card "Últimos partidos" ni la card de Ranking.

### Archivos a editar
- `src/pages/Index.tsx` (único archivo).
