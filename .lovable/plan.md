## Objetivo

Crear una nueva competencia paralela: cada equipo tiene un **jugador ficticio** (ej. "Equipo IT prom.") cuyos puntos son el **promedio entero** de los puntos que sus compañeros reales ganan en cada partido. Estos jugadores se rankean entre sí en una nueva categoría **"Inter Áreas"**, sin mezclarse con el ranking global ni el de equipos, y sin participar de logros.

## Lógica de cálculo

Por cada partido finalizado y por cada equipo:

- Identificar los miembros del equipo que **predijeron ese partido**.
- Sumar sus `points_awarded` para ese partido.
- Dividir por la cantidad de predictores → **redondear a entero** (`ROUND`).
- Ese valor es el aporte del jugador ficticio para ese partido.

El total del jugador ficticio = suma de los promedios redondeados de todos los partidos donde al menos 1 miembro del equipo predijo. Si nadie del equipo predijo un partido, ese partido aporta 0.

## Cambios en base de datos (migración)

### 1. Nueva tabla `team_avatars`

Representa al "jugador ficticio" de cada equipo:

- `id uuid pk`
- `team_id uuid unique` (FK a `teams`)
- `name text` (auto: "Equipo {nombre} prom.")
- `created_at`

Trigger: al crear un team, se crea automáticamente su `team_avatar`. Migración inicial: poblar uno por cada team existente.

### 2. Nueva tabla `team_avatar_ranks`

- `team_avatar_id uuid pk`
- `current_rank int`
- `previous_rank int`
- `total_points int default 0`
- `updated_at`

RLS: SELECT abierto a `authenticated`.

### 3. Nuevas funciones

- `**recalculate_team_avatar_points()**`: recalcula `total_points` para todos los `team_avatars` usando la lógica de promedio redondeado por partido.
- `**recalculate_team_avatar_ranks()**`: ordena por `total_points DESC` y asigna `current_rank` (rompe empates por nombre).
- `**snapshot_team_avatar_ranks()**`: copia `current_rank → previous_rank` (para tendencia).

### 4. Integración

- Llamar a `recalculate_team_avatar_points()` y `recalculate_team_avatar_ranks()` desde `Admin.tsx` después de cada actualización de resultados (junto a las otras `recalculate_*`).
- Llamar a `snapshot_team_avatar_ranks()` antes del recálculo (mismo patrón que ya existe).

## Cambios en frontend

### `src/pages/Ranking.tsx`

Agregar nueva opción al `Select` de scope: **"🏢 Inter Áreas"** (separada de Global/Equipos).

Cuando el usuario elige "Inter Áreas":

- Cargar desde una nueva fuente (join `team_avatars + teams + team_avatar_ranks`).
- Mostrar tabla con columnas: **Posición · Usuario (nombre del jugador ficticio + ícono 🏢) · Puntos · Tendencia**.
- Reutilizar `positionCell`, `TrendBadge` y los estilos de medallas (oro/plata/bronce).
- No mostrar columna "Equipo" (es implícito).
- Resaltar el equipo asociado al usuario (es decir si el usuario logueado es del Equipo IT, resaltar al team_avatar asociado (en este ejemplo "Equipo IT prom.").
- Tarjeta "Tu posición" se oculta en este scope (no aplica).

### Exclusión del resto del sistema

- Los `team_avatars` **no** son `profiles`, no tienen `user_id` en `auth.users`, por lo tanto:
  - No aparecen en ranking global ni de equipo (que se basan en `profiles`).
  - No reciben logros (la función `recalculate_achievements` opera sobre `profiles`).
  - No hacen predicciones.

## Archivos a modificar/crear

- **Nueva migración SQL**: tablas `team_avatars`, `team_avatar_ranks`, funciones de recálculo/snapshot, trigger de auto-creación, RLS, y backfill inicial.
- `**src/pages/Admin.tsx**`: agregar llamadas a las nuevas funciones tras actualizar resultados.
- `**src/pages/Ranking.tsx**`: agregar opción "Inter Áreas" en el Select y branch de render para esta categoría.
- `**src/integrations/supabase/types.ts**`: se regenera automáticamente.

## Notas

- El nombre del jugador ficticio sigue el formato **"Equipo {nombre} prom."** (ej. "Equipo IT prom.").
- Se renderiza con un avatar/ícono distintivo (🏢) en lugar de `UserAvatar` para diferenciarlo visualmente de jugadores reales.
- Tendencia funciona igual que en los otros rankings (snapshot previo vs actual).