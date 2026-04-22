// Utilidades para reemplazar emojis de bandera por imágenes de flagcdn.com.
// Usa un mapeo EXPLÍCITO de nombre de país → código ISO 3166-1 alpha-2.

/**
 * Mapeo explícito nombre → código ISO 3166-1 alpha-2 (en minúsculas).
 * Incluye códigos especiales de flagcdn para subdivisiones (gb-sct, gb-eng, gb-wls).
 */
export const COUNTRY_CODE_MAP: Record<string, string> = {
  // Sudamérica
  "Argentina": "ar",
  "Brasil": "br",
  "Uruguay": "uy",
  "Colombia": "co",
  "Ecuador": "ec",
  "Paraguay": "py",
  // Norte/Centroamérica
  "México": "mx",
  "Canadá": "ca",
  "EE. UU.": "us",
  "Estados Unidos": "us",
  "Panamá": "pa",
  "Haití": "ht",
  "Curazao": "cw",
  // Europa
  "Alemania": "de",
  "España": "es",
  "Francia": "fr",
  "Portugal": "pt",
  "Inglaterra": "gb-eng",
  "Escocia": "gb-sct",
  "Gales": "gb-wls",
  "Países Bajos": "nl",
  "Bélgica": "be",
  "Suiza": "ch",
  "Austria": "at",
  "Croacia": "hr",
  "Chequia": "cz",
  "Noruega": "no",
  "Suecia": "se",
  "Turquía": "tr",
  "Bosnia y Herzegovina": "ba",
  // África
  "Marruecos": "ma",
  "Egipto": "eg",
  "Argelia": "dz",
  "Túnez": "tn",
  "Senegal": "sn",
  "Ghana": "gh",
  "Costa de Marfil": "ci",
  "RD Congo": "cd",
  "Sudáfrica": "za",
  "Islas de Cabo Verde": "cv",
  "Cabo Verde": "cv",
  // Asia
  "Japón": "jp",
  "República de Corea": "kr",
  "Corea del Sur": "kr",
  "Arabia Saudí": "sa",
  "Catar": "qa",
  "Irak": "iq",
  "RI de Irán": "ir",
  "Irán": "ir",
  "Jordania": "jo",
  "Uzbekistán": "uz",
  // Oceanía
  "Australia": "au",
  "Nueva Zelanda": "nz",
};

/**
 * Devuelve el código ISO para un nombre de país (ya limpio, sin emoji).
 * Devuelve null si no está en el mapeo.
 */
export const getCountryCode = (name: string): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  return COUNTRY_CODE_MAP[trimmed] ?? null;
};

const SPECIAL_TAG_FLAGS = [
  "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  "🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
];
const REGIONAL_INDICATOR_RE = /^([\u{1F1E6}-\u{1F1FF}])([\u{1F1E6}-\u{1F1FF}])/u;

/** Quita el prefijo emoji + espacio del nombre del equipo. */
export const stripFlagEmoji = (text: string): string => {
  if (!text) return text;
  for (const emoji of SPECIAL_TAG_FLAGS) {
    if (text.startsWith(emoji)) return text.slice(emoji.length).trimStart();
  }
  const m = text.match(REGIONAL_INDICATOR_RE);
  if (!m) return text;
  return text.slice(m[0].length).trimStart();
};

/**
 * Extrae el código ISO desde un string que puede tener emoji + nombre,
 * usando exclusivamente el mapeo explícito por nombre.
 */
export const extractCountryCode = (text: string): string | null => {
  if (!text) return null;
  return getCountryCode(stripFlagEmoji(text));
};

interface CountryFlagProps {
  code: string | null;
  name: string;
  size?: number; // alto en px
  className?: string;
}

/**
 * Renderiza la bandera del país desde flagcdn.com.
 * Si code es null, muestra un placeholder neutro (no imagen rota).
 */
export const CountryFlag = ({ code, name, size = 18, className = "" }: CountryFlagProps) => {
  const w = Math.round((size * 4) / 3); // ratio 4:3
  if (!code) {
    return (
      <span
        aria-label={name || "bandera no disponible"}
        title={name}
        style={{ width: w, height: size }}
        className={`inline-block shrink-0 rounded-[2px] bg-muted align-[-3px] ${className}`}
      />
    );
  }
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
 * Renderiza nombre de equipo: bandera (resuelta por el mapeo explícito) + nombre limpio.
 */
export const TeamName = ({ name, flagSize = 16, className = "" }: TeamNameProps) => {
  const clean = stripFlagEmoji(name);
  const code = getCountryCode(clean);
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <CountryFlag code={code} name={clean} size={flagSize} />
      <span className="truncate">{clean}</span>
    </span>
  );
};
