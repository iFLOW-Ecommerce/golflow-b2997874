## Funcionalidad: Logros (Top 3 por etapa, global y por equipo)

### 1. Definición de "etapa" para logros
- **`group`** → Fase de grupos (todos los partidos con `stage='group'`)
- **`knockout`** → Eliminatorias (stages: `round_of_32`, `round_of_16`, `quarterfinal`, `semifinal`, `third_place`, `final`)
- **`tournament`** → Torneo Mundial 2026 (todos los partidos)

Una etapa se considera "completada" cuando **todos** los partidos de esa agrupación tienen `is_finished = true` y `home_score`/`away_score` no nulos.

### 2. Backend — nueva tabla `achievements`

Migración SQL nueva:

```sql
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global','team')),
  team_id uuid NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  stage_group text NOT NULL CHECK (stage_group IN ('group','knockout','tournament')),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, COALESCE(team_id, '00000000-0000-0000-0000-000000000000'::uuid), stage_group)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by authenticated"
  ON public.achievements FOR SELECT TO authenticated USING (true);
```
(Sólo SELECT pública; los inserts los hace una función `SECURITY DEFINER`.)

### 3. Función SQL `recalculate_achievements()`

`SECURITY DEFINER`. Lógica:

1. Para cada `stage_group` (`group`, `knockout`, `tournament`):
   - Verificar si **todos** los partidos de ese grupo están `is_finished = true` y con scores. Si no, saltarlo.
2. Calcular puntos por usuario sumando `points_awarded` sólo de predicciones cuyo `match_id` pertenezca a esa etapa.
3. **Global top 3**: ordenar usuarios por puntos DESC, `email` ASC; tomar top 3 con `points > 0`.
4. **Team top 3**: para cada `team_id`, ordenar miembros del equipo por puntos DESC; tomar top 3 con `points > 0`.
5. `DELETE FROM achievements` para esa etapa y reinsertar (idempotente).

Se agregarán llamadas a `recalculate_achievements()` desde donde hoy se llama `recalculate_user_ranks()`/`recalculate_team_ranks()` en el flujo del Admin (al guardar resultados). Si no existe ese punto centralizado, se llamará desde `Admin.tsx` luego del update de matches.

### 4. Frontend — Hero en `src/pages/Index.tsx`

**Fetch nuevo** dentro del `Promise.all` actual:
```ts
supabase.from("achievements")
  .select("scope, team_id, stage_group, position")
  .eq("user_id", user.id)
```

**Estado**: `const [achievements, setAchievements] = useState<Achievement[]>([])`.

**Orden de render** (filtrar primero por scope, luego por stage_group):
1. Globales: `tournament` → `knockout` → `group`
2. Equipo: `tournament` → `knockout` → `group`

**Etiquetas**:
- Global: `#{position} Ranking Global` con prefijo según etapa: `Torneo:`, `Eliminatorias:`, `Fase de grupos:`
- Equipo: `#{position} Ranking Equipo {teamName}` con mismos prefijos

Ejemplos visibles:
- 🏆 Fase de grupos: #1 Ranking Global
- ⭐ Eliminatorias: #2 Ranking Equipo IT

**Sección oculta si `achievements.length === 0`**.

### 5. Componente `AchievementChip` (inline en Index o nuevo `src/lib/achievement-chip.tsx`)

Mismo estilo visual que `MultiplierBadge` (rounded-full, fuente bold, padding compacto):

```tsx
// Global (verde neón)
<span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/30 px-2.5 py-1 text-xs font-semibold">
  🏆 {label}
</span>

// Equipo (amarillo neón)
<span className="inline-flex items-center gap-1 rounded-full bg-yellow-300/15 text-yellow-200 border border-yellow-300/30 px-2.5 py-1 text-xs font-semibold">
  ⭐ {label}
</span>
```

### 6. Ubicación en el Hero

Debajo del bloque de chips de Precisión/Racha (después de la línea ~272 en `Index.tsx`), dentro del mismo `<div className="min-w-0">`:

```tsx
{achievements.length > 0 && (
  <div className="mt-3">
    <div className="text-[11px] uppercase tracking-wide opacity-80 font-medium mb-1.5">
      🎖️ Logros
    </div>
    <div className="flex flex-wrap gap-1.5">
      {sortedAchievements.map(a => <AchievementChip key={...} {...} />)}
    </div>
  </div>
)}
```

### 7. Archivos afectados
- **Nueva migración**: tabla `achievements` + función `recalculate_achievements`
- **`src/pages/Admin.tsx`**: invocar `supabase.rpc('recalculate_achievements')` después de guardar resultados (junto a las llamadas existentes de recálculo de ranks)
- **`src/pages/Index.tsx`**: fetch + render de la sección Logros
- **`src/lib/achievement-chip.tsx`** (nuevo): componente reutilizable

### 8. Consideraciones
- Los logros se asignan sólo si el usuario tiene `points > 0` en esa etapa (evita "campeones" con 0 puntos cuando hay menos de 3 jugadores activos).
- Si un equipo tiene menos de 3 miembros, sólo se otorgarán los logros que correspondan (1° y 2° si hay 2, etc.).
- La función es idempotente: se puede correr múltiples veces sin duplicar.
