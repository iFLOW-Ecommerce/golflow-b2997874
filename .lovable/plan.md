## Objetivo
Mejorar performance, seguridad y mantenibilidad sin alterar la UI ni el comportamiento observable.

---

### 1. Paralelizar snapshots y recálculos en `Admin.tsx` (con cuidado de dependencias)

**Snapshots** (`handleSaveScores`, `handleSaveTeams`): los 3 escriben en tablas distintas y solo copian `current_rank → previous_rank`. Son independientes:
```ts
await Promise.all([
  supabase.rpc("snapshot_user_ranks"),
  supabase.rpc("snapshot_team_ranks"),
  supabase.rpc("snapshot_team_avatar_ranks"),
]);
```

**Recálculos**: hay una dependencia real → `recalculate_team_avatar_ranks` ordena por `total_points` que `recalculate_team_avatar_points` acaba de actualizar. Por eso:
```ts
await Promise.all([
  supabase.rpc("recalculate_user_ranks"),
  supabase.rpc("recalculate_team_ranks"),
  supabase.rpc("recalculate_achievements"),
  supabase.rpc("recalculate_team_avatar_points"),
]);
await supabase.rpc("recalculate_team_avatar_ranks"); // depende del anterior
```
Resultado: misma semántica, ~2-3× más rápido al guardar.

---

### 2. Optimizar fetch del ranking del usuario en `Index.tsx`

Hoy se trae toda la tabla `user_ranking` para encontrar la ventana del usuario. Cambiar a:
- 1 query para obtener `current_rank` del usuario.
- 1 query con `.gte("rank", rank-2).lte("rank", rank+2).order("rank")` para traer solo la ventana.

**Ventana de 5 con clamp** (importante, según indicaste):
- Si `rank ≤ 2` → traer `rank 1..5`.
- Si `rank ≥ total-1` → traer los últimos 5 (`total-4 .. total`).
- En cualquier otro caso → `rank-2 .. rank+2`.

Para conocer `total` se usa `count: "exact", head: true` en una query barata. Garantiza siempre 5 jugadores visibles cuando hay ≥5 en el sistema.

---

### 3. Centralizar `profile` + `isAdmin` en `useAuth`

Hoy `AppSidebar.tsx` y `Admin.tsx` hacen la misma query a `profiles`. Mover al provider:
- `useAuth()` expone también `profile` e `isAdmin` (cargados una vez al iniciar sesión, refrescables).
- Eliminar las queries duplicadas en `AppSidebar` y `Admin`.

No cambia comportamiento, solo evita un round-trip extra por pantalla.

---

### 4. Aislar el countdown del Mundial en `Index.tsx`

Hoy un `setInterval(1s)` re-renderiza toda la página (~900 líneas, varias cards, listas). Extraer a `<CountdownToWorldCup />` que se re-renderice solo a sí mismo cada segundo.

Sin cambios visuales.

---

### 5. Cleanup de `useEffect` en `Index.tsx`, `Ranking.tsx`, `Prediccion.tsx`

Agregar `let cancelled = false` y chequearlo antes de `setState` después de awaits, para evitar race conditions y warnings al desmontar componentes durante una carga.

---

### 6. Search server-side + debounce en `AdminPasswordResets.tsx`

Hoy carga todos los emails de `profiles` al montar. Cambiar a:
- Input con debounce (300ms).
- Query con `.or("email.ilike.%q%,first_name.ilike.%q%,last_name.ilike.%q%").limit(20)`.
- No carga nada hasta que el admin tipea ≥2 caracteres.

Reduce memoria, transferencia y tiempo de carga inicial del tab "Usuarios".

---

### 7. Hardening de permisos de RPC (migration)

Las funciones `recalculate_*` y `snapshot_*` son `SECURITY DEFINER`. Hoy cualquier usuario autenticado podría invocarlas vía PostgREST. Migration:
```sql
REVOKE EXECUTE ON FUNCTION public.recalculate_user_ranks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_team_ranks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_team_avatar_points() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_team_avatar_ranks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_achievements() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_user_ranks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_team_ranks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.snapshot_team_avatar_ranks() FROM anon, authenticated;
```
Como Admin.tsx también llama estas RPCs desde el cliente, **además** se crea una RPC wrapper `admin_run_recalcs()` que valida `is_admin` y orquesta todo internamente, y `Admin.tsx` pasa a llamar solo a ese wrapper. Misma funcionalidad, sin exponer las primitivas.

---

### 8. Quitar `as any` y centralizar tipos

- Definir interfaces para las vistas (`user_ranking`, `team_ranking`, etc.) en `src/lib/types.ts`.
- Reemplazar los `as any` en pages/components por estos tipos.

Mejora autocompletado y previene errores silenciosos.

---

### 9. Centralizar formatos y constantes

- `src/lib/format.ts`: `formatDate`, `formatDateTime`, helpers de fechas (hoy duplicados entre `Admin.tsx`, `Index.tsx`, `Prediccion.tsx`).
- `src/lib/constants.ts`: nombres de etapas, multiplicadores, labels.

Sin cambios visuales — solo deduplicación.

---

### Garantías
- **Cero cambios de UI**: ningún componente visual se modifica.
- **Cero cambios de comportamiento**: misma lógica de puntos, snapshots, ranking y reset de claves.
- **Migraciones reversibles**: solo `REVOKE` + creación de wrapper, no se borran funciones.

¿Avanzo con todo en una sola pasada?