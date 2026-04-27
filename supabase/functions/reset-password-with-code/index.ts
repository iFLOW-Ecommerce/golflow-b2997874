import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim().toUpperCase();
    const newPassword = String(body?.new_password ?? "");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Código inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "La clave debe tener al menos 6 caracteres" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Buscar perfil por email
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("email", email)
      .maybeSingle();

    // Respuesta genérica para no filtrar si el email existe
    const genericError = () =>
      new Response(
        JSON.stringify({ error: "Email o código incorrectos" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

    if (!profile) return genericError();

    const codeHash = await sha256Hex(code);
    const nowIso = new Date().toISOString();

    const { data: row } = await admin
      .from("password_reset_codes")
      .select("id, code_hash, expires_at, used_at, failed_attempts")
      .eq("user_id", profile.user_id)
      .is("used_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return genericError();

    if (row.failed_attempts >= MAX_ATTEMPTS) {
      // Invalidar el código
      await admin
        .from("password_reset_codes")
        .update({ used_at: nowIso })
        .eq("id", row.id);
      return new Response(
        JSON.stringify({
          error: "Demasiados intentos. Pedile al admin un nuevo código.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (row.code_hash !== codeHash) {
      await admin
        .from("password_reset_codes")
        .update({ failed_attempts: row.failed_attempts + 1 })
        .eq("id", row.id);
      return genericError();
    }

    // Actualizar la contraseña
    const { error: updErr } = await admin.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword },
    );
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("password_reset_codes")
      .update({ used_at: nowIso })
      .eq("id", row.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
