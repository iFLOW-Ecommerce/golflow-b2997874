
## Plan: Registro extendido con perfil completo

### 1. Migración de base de datos

**Nueva tabla `teams`:**
```sql
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Lectura pública para usuarios autenticados
CREATE POLICY "Teams viewable by authenticated users"
  ON public.teams FOR SELECT TO authenticated USING (true);

-- Solo admins pueden modificar
CREATE POLICY "Admins manage teams" ON public.teams FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin = true));
```

**Seed inicial de equipos** (14 equipos, con "Gente & Cultura" corregido):
Operaciones CDN, Operaciones CDR, Operaciones CDT, Operaciones CDG, Operaciones CDQ, ecommerce, Comercial, IT, Administración & Finanzas, Gente & Cultura, Mantenimiento, Internacional, Liquidaciones, Tráfico.

**Extender `profiles`:**
```sql
ALTER TABLE public.profiles
  ADD COLUMN first_name text,
  ADD COLUMN last_name text,
  ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN avatar_seed text;
```

**Actualizar `handle_new_user`** para leer `raw_user_meta_data` y persistir `first_name`, `last_name`, `team_id`, `avatar_seed` enviados desde el signup.

### 2. Pantalla de registro (`src/pages/Auth.tsx`)

En la pestaña "Registrarme" agregar (en este orden, antes de email/password):
- **Nombre** (input requerido)
- **Apellido** (input requerido)
- **Equipo** (Select con `teams` cargados desde DB, requerido)
- **Avatar** (grid 4×2 con 8 opciones generadas con seeds `${tempUuid}-1..8`, estilo `bottts-neutral`). El seed se genera al montar el formulario con `crypto.randomUUID()` y se reutiliza al hacer signup.

URL avatar: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed={seed}`.

Enviar todo en `options.data` del `signUp` para que `handle_new_user` los persista. Validar que todos los campos estén completos antes de submit.

### 3. Componentes/helpers nuevos

- **`src/lib/user-avatar.tsx`** — Componente `<UserAvatar seed size />` que renderiza el SVG de DiceBear (usando `<Avatar>` + `AvatarImage` ya existente). Fallback a iniciales si no hay seed.
- **`src/lib/display-name.ts`** — Helper `displayName({first_name, last_name, email})` que devuelve "Nombre Apellido" o el email como fallback, y `firstName(...)` para el hero.

### 4. Actualizar consultas y vistas en cliente

Como `user_ranks` no incluye perfil, las páginas que lo usan ya hacen JOIN manual con `profiles`. Hay que extender esos selects para traer `first_name, last_name, avatar_seed, team:teams(name)`.

- **`src/pages/Index.tsx`**:
  - Hero: cargar perfil del usuario y mostrar `Hola, {firstName}` (fallback al email actual).
  - Card Ranking: agregar `<UserAvatar>` antes del nombre y mostrar nombre completo en lugar de email.
- **`src/pages/Ranking.tsx`**: reordenar columnas a `#`, `Avatar+Usuario`, `Equipo`, `Puntos`, `Tend.` y mostrar avatar+nombre completo+equipo.
- **`src/components/AppSidebar.tsx`**: en el footer mostrar nombre completo (con avatar pequeño opcional) en lugar del email.

### 5. Reglas y consideraciones

- No tocar el flujo de login (sign in queda igual).
- Usuarios existentes tendrán `first_name/last_name/team_id/avatar_seed` en NULL → se sigue mostrando el email como fallback hasta que editen su perfil (edición fuera de alcance de esta tarea).
- No modificar lógica de puntos ni de ranking.
- DiceBear sin colores forzados, paleta default.

¿Procedo con la implementación?
