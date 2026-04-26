## Cambios en `/Inicio` — sección Ranking

### 1. Layout: dividir la card actual en dos, lado a lado

Reemplazar la única `<Card>` "Ranking" (líneas 538–583) por un contenedor `grid md:grid-cols-2 gap-4` con **dos cards horizontales**:
- **Card A** — Ranking individual con switch Global/Equipo
- **Card B** — Ranking Inter-Áreas (ventana del área del usuario)

En mobile se apilan; en desktop quedan en dos columnas.

---

### 2. Card A: Ranking individual con switch Global ↔ Equipo

- Estado local nuevo: `const [rankView, setRankView] = useState<"global" | "team">("team")` (default a equipo si el usuario tiene equipo, sino "global").
- En el `CardHeader`, junto al título, agregar un toggle estilo on-off usando el componente `Switch` de `@/components/ui/switch`, flanqueado por:
  - Izquierda: `🌐 Global` (o ícono `Globe`)
  - Derecha: `⭐ {nombre del equipo}` (mismos íconos que ya usamos: 🌐 trofeo/global y ⭐ estrella, manteniendo la convención del hero y de `Ranking.tsx`).
  - El estado `checked` representa "equipo".
- `CardDescription` dinámico: muestra la posición/puntos según el view actual (reusa `myPosition`/`myPoints` para global, `myTeamPosition`/`myTeamTotal` para equipo).

**Datos a cargar (extender el `select` del query `user_ranking`)**:
- Ya trae `team_id`, `team_name`, `team_current_rank`, `team_previous_rank`. Suficiente.
- Construir un nuevo estado `teamRankingWindow` análogo a `rankingWindow` pero filtrando `rows.filter(r => r.team_id === myTeamId)` y reordenando por puntos+email, luego calculando ventana de 5 alrededor del usuario (misma lógica que la existente para global). Esto se hace en el mismo `useEffect` ya presente.

**Render de la lista (dentro de la card)**:
- Si `rankView === "global"`: lista actual `rankingWindow` + agregar columna **equipo** (texto `text-xs text-muted-foreground truncate` con `r.team_name`, oculto en pantallas muy chicas con `hidden sm:inline`).
- Si `rankView === "team"`: lista `teamRankingWindow` **sin** la columna equipo (es redundante).
- En ambos: posición (#), avatar, nombre, puntos, `TrendBadge` (usando `current_rank`/`previous_rank` global o `team_current_rank`/`team_previous_rank` según el view).
- Mantener resaltado del usuario actual (`isMe`).

Footer: botón "Ver ranking" que linkea a `/ranking` (ya existe).

---

### 3. Card B: Ranking Inter-Áreas (ventana del área del usuario)

Estructura idéntica a Card A pero con datos de `team_avatars` + `team_avatar_ranks`.

**Carga de datos** (agregar al `Promise.all` del `useEffect` existente):
```ts
supabase
  .from("team_avatars" as any)
  .select("id, team_id, name, team_avatar_ranks(total_points, current_rank, previous_rank)")
```
Mapear igual que en `Ranking.tsx` (líneas 70–82) a un array `TeamAvatarRow[]` y guardarlo en estado.

**Procesamiento**:
- Ordenar por `total_points DESC`, `name ASC`.
- Encontrar el índice del avatar cuyo `team_id === myTeamId`.
- Calcular ventana de 5 (mismo algoritmo que `rankingWindow`: 2 antes / 2 después, ajustando bordes).

**Render**:
- Header: ícono `Building2` + título "Inter Áreas" + descripción tipo "Tu área entre las más cercanas".
- Lista con: posición (#), ícono 🏢/`Building2` en círculo `bg-primary/15`, nombre del avatar (ej. "Equipo IT prom."), puntos, `TrendBadge`.
- Resaltar la fila del área del usuario (`row.team_id === myTeamId`) con la misma clase que usa la fila "isMe" de Card A (`bg-primary/10 border-l-2 border-l-primary font-semibold`).
- Si el usuario no tiene equipo: mostrar mensaje "No perteneces a un área" y listar el top 5 global de Inter-Áreas como fallback.

Footer: botón "Ver ranking" → `/ranking` (mismo destino; el usuario puede cambiar a Inter Áreas con el selector existente).

---

### 4. Detalles de implementación

**Archivo a editar**: `src/pages/Index.tsx` únicamente.

**Imports nuevos**:
- `Switch` desde `@/components/ui/switch`
- `Building2` desde `lucide-react`

**Nuevos estados**:
```ts
const [rankView, setRankView] = useState<"global" | "team">("global");
const [teamRankingWindow, setTeamRankingWindow] = useState<typeof rankingWindow>([]);
const [interAreasWindow, setInterAreasWindow] = useState<Array<{
  position: number; team_avatar_id: string; team_id: string; name: string;
  total_points: number; current_rank: number | null; previous_rank: number | null;
}>>([]);
```

**Default del switch**: cuando se carga el perfil, si `myTeamId` existe → `setRankView("team")`, sino dejar "global". Hacerlo dentro del `useEffect` de carga, después de setear `myTeamId`.

**Sin cambios en**:
- Base de datos (todo ya existe: `team_avatars`, `team_avatar_ranks`, vista `user_ranking`).
- Otros archivos (`Ranking.tsx`, etc.).
- Lógica de cálculo de puntos.

---

### Resumen visual final

```
┌──────────────────────────────────────────────────────────┐
│ [📊 Ranking]   🌐 Global  [●━━○]  ⭐ Mi Equipo          │
│ Tu posición: #X de Y · Z pts                             │
│ ─────────────────────────────────────────────────        │
│ #3  👤 Juan      IT       120 pts  ▲                    │
│ #4  👤 Vos       IT       110 pts  ─    ← resaltado    │
│ #5  👤 Ana       IT       100 pts  ▼                    │
│ [Ver ranking]                                            │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ [🏢 Inter Áreas]                                         │
│ Tu área entre las más cercanas                           │
│ ─────────────────────────────────────────────────        │
│ #2  🏢 Equipo Marketing prom.   85 pts  ▲               │
│ #3  🏢 Equipo IT prom.          80 pts  ─  ← resaltado │
│ #4  🏢 Equipo G&C prom.         75 pts  ▼               │
│ [Ver ranking]                                            │
└──────────────────────────────────────────────────────────┘
```
(En desktop, ambas cards se muestran lado a lado.)
