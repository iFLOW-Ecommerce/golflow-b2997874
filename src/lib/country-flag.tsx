// Utilidades para reemplazar emojis de bandera por imágenes de flagcdn.com.
// Acepta nombres de equipo en el formato "🇦🇷 Argentina" o ya limpios.

const SPECIAL_TAG_FLAGS: Record<string, string> = {
  // Banderas con "tag sequence" (subdivisiones) → códigos flagcdn
  "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}": "gb-sct", // Escocia
  "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}": "gb-eng", // Inglaterra
  "🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}": "gb-wls", // Gales
};

const REGIONAL_INDICATOR_RE = /^([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/u;

/**
 * Extrae el código ISO 3166-1 alpha-2 (en minúsculas) desde el prefijo emoji
 * de un string. Devuelve null si no encuentra bandera reconocible.
 */
export const extractCountryCode = (text: string): string | null => {
  if (!text) return null;
  for (const [emoji, code] of Object.entries(SPECIAL_TAG_FLAGS)) {
    if (text.startsWith(emoji)) return code;
  }
  const m = text.match(REGIONAL_INDICATOR_RE);
  if (!m) return null;
  const a = m[1].codePointAt(0)! - 0x1f1e6;
  const b = m[2].codePointAt(0)! - 0x1f1e6;
  return String.fromCharCode(97 + a, 97 + b);
};

/** Quita el prefijo emoji + espacio del nombre del equipo. */
export const stripFlagEmoji = (text: string): string => {
  if (!text) return text;
  for (const emoji of Object.keys(SPECIAL_TAG_FLAGS)) {
    if (text.startsWith(emoji)) return text.slice(emoji.length).trimStart();
  }
  const m = text.match(REGIONAL_INDICATOR_RE);
  if (!m) return text;
  return text.slice(m[0].length).trimStart();
};

interface CountryFlagProps {
  code: string | null;
  name: string;
  size?: number; // alto en px
  className?: string;
}

/**
 * Renderiza la bandera del país desde flagcdn.com.
 * Si code es null, no renderiza nada.
 */
export const CountryFlag = ({ code, name, size = 18, className = "" }: CountryFlagProps) => {
  if (!code) return null;
  const w = Math.round((size * 4) / 3); // ratio 4:3
  return (
    <img
      src={`https://flagcdn.com/${w}x${size}/${code}.png`}
      srcSet={`https://flagcdn.com/${w * 2}x${size * 2}/${code}.png 2x`}
      width={w}
      height={size}
      alt={name}
      loading="lazy"
      className={`inline-block shrink-0 rounded-[2px] object-cover align-[-3px] ${className}`}
    />
  );
};

interface TeamNameProps {
  name: string;
  flagSize?: number;
  className?: string;
}

/**
 * Renderiza nombre de equipo: bandera (si el nombre tiene prefijo emoji) + nombre limpio.
 */
export const TeamName = ({ name, flagSize = 16, className = "" }: TeamNameProps) => {
  const code = extractCountryCode(name);
  const clean = stripFlagEmoji(name);
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <CountryFlag code={code} name={clean} size={flagSize} />
      <span className="truncate">{clean}</span>
    </span>
  );
};
