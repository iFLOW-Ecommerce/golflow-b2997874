## Flujo

1. Jugador olvida su clave → toca **"Olvidé mi clave"** en `/auth`.
2. Se le pide su **email** + un **código de reseteo** (token de 8 caracteres) + nueva clave.
3. El jugador le pide al admin que le genere el código desde `/admin`.
4. El admin entra a `/admin`, abre la sección **"Reseteos de clave"**, busca al usuario, genera un código (válido por 24h, de un solo uso) y se lo pasa al jugador por un canal externo (WhatsApp, en persona, etc.).
5. El jugador completa el formulario → la clave se actualiza.

Esto evita los riesgos de usar `user_id` directo (no es secreto, es enumerable) y no requiere que el sistema de email de auth esté configurado.

## Cambios en backend (migración)

Crear tabla `password_reset_codes`:
- `id uuid pk`
- `user_id uuid not null` (referencia lógica a `auth.users`, sin FK directa)
- `code_hash text not null` (guardamos solo el hash SHA-256, nunca el código en claro)
- `created_by uuid not null` (admin que lo generó)
- `expires_at timestamptz not null` (default `now() + interval '24 hours'`)
- `used_at timestamptz` (nullable; al consumirse se marca)
- `created_at timestamptz default now()`

RLS: solo admins pueden hacer `SELECT/INSERT`. Nadie hace `UPDATE/DELETE` directo desde el cliente — todo el consumo va por edge function con `service_role`.

Índice: `(user_id) where used_at is null` para invalidar códigos previos.

## Edge functions

**`admin-generate-reset-code`** (requiere admin autenticado)
- Input: `{ user_id: string }`
- Valida que el caller esté logueado y sea admin (consulta `profiles.is_admin`).
- Genera código aleatorio de 8 chars alfanuméricos (sin caracteres ambiguos: 0/O, 1/I).
- Invalida códigos previos del mismo usuario (`update used_at = now() where user_id = X and used_at is null`).
- Inserta el nuevo registro con `code_hash = sha256(code)`.
- Devuelve el código en claro **una sola vez** al admin.

**`reset-password-with-code`** (público, sin JWT)
- Input: `{ email, code, new_password }` (validado con zod: password mín 6).
- Busca el `user_id` asociado al email vía `auth.admin.listUsers` filtrado, o usando `profiles.email`.
- Busca un código activo (`used_at is null`, `expires_at > now()`) cuyo `code_hash` matchee.
- Si match → `auth.admin.updateUserById(user_id, { password })` y marca `used_at = now()`.
- Rate limit básico: si fallan 5 intentos seguidos para un email en 15 min, rechaza (registrar en una tabla simple de intentos o usar un contador en `password_reset_codes`).

Ambas funciones desplegadas con el patrón estándar de Lovable Cloud (CORS, validación de input).

## Cambios en frontend

**`src/pages/Auth.tsx`**
- Agregar link **"¿Olvidaste tu clave?"** debajo del form de signin.
- Nueva tab/vista o dialog **"Restablecer clave"** con campos: email, código, nueva clave, confirmar clave.
- Llama a `supabase.functions.invoke('reset-password-with-code', ...)` y muestra toast del resultado.

**`src/pages/Admin.tsx`**
- Nueva sección **"Generar código de reseteo"** (al final, junto a las otras herramientas).
- Selector/buscador de usuario (lista de `profiles` con nombre + email).
- Botón **"Generar código"** → invoca `admin-generate-reset-code`.
- Muestra el código generado en una card destacada con botón "Copiar al portapapeles" y aviso: *"Este código se mostrará una sola vez. Compartilo con el jugador por un canal seguro. Vence en 24h."*

## Seguridad
- Códigos guardados solo como hash (no recuperables).
- Expiración 24h + uso único.
- Generación restringida a admins vía RLS + validación en edge function.
- Rate limit en consumo para evitar brute-force del código de 8 chars.
- Logs de auditoría implícitos en `created_by` y timestamps.