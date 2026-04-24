type ProfileLike = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export function displayName(p: ProfileLike): string {
  const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (p.email) return p.email.split("@")[0];
  return "Usuario";
}

export function firstName(p: ProfileLike): string {
  if (p.first_name && p.first_name.trim()) return p.first_name.trim();
  if (p.email) return p.email.split("@")[0];
  return "jugador";
}
