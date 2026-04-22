// Mapeo estático nombre → código ISO 3166-1 alpha-2 (códigos flagcdn).
// No interpreta emojis: solo busca el nombre normalizado en el mapeo.

const RAW_MAP: Record<string, string> = {
  // Sudamérica
  "argentina": "ar",
  "brasil": "br",
  "uruguay": "uy",
  "colombia": "co",
  "ecuador": "ec",
  "paraguay": "py",
  // Norte/Centroamérica/Caribe
  "mexico": "mx",
  "canada": "ca",
  "ee. uu.": "us",
  "ee.uu.": "us",
  "estados unidos": "us",
  "panama": "pa",
  "haiti": "ht",
  "curazao": "cw",
  // Europa
  "alemania": "de",
  "espana": "es",
  "francia": "fr",
  "portugal": "pt",
  "inglaterra": "gb-eng",
  "escocia": "gb-sct",
  "gales": "gb-wls",
  "paises bajos": "nl",
  "belgica": "be",
  "suiza": "ch",
  "austria": "at",
  "croacia": "hr",
  "chequia": "cz",
  "noruega": "no",
  "suecia": "se",
  "turquia": "tr",
  "bosnia y herzegovina": "ba",
  // África
  "marruecos": "ma",
  "egipto": "eg",
  "argelia": "dz",
  "tunez": "tn",
  "senegal": "sn",
  "ghana": "gh",
  "costa de marfil": "ci",
  "rd congo": "cd",
  "sudafrica": "za",
  "islas de cabo verde": "cv",
  "cabo verde": "cv",
  // Asia
  "japon": "jp",
  "republica de corea": "kr",
  "corea del sur": "kr",
  "arabia saudi": "sa",
  "catar": "qa",
  "irak": "iq",
  "ri de iran": "ir",
  "iran": "ir",
  "jordania": "jo",
  "uzbekistan": "uz",
  // Oceanía
  "australia": "au",
  "nueva zelanda": "nz",
};

/** Normaliza: minúsculas, sin tildes, espacios colapsados. */
const normalize = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Devuelve el código ISO para un nombre, o null si no está en el mapeo. */
export const getCountryCode = (name: string): string | null => {
  if (!name) return null;
  return RAW_MAP[normalize(name)] ?? null;
};

interface CountryFlagProps {
  name: string;
  size?: number; // alto en px
  className?: string;
}

/**
 * Renderiza la bandera del país desde flagcdn.com a partir del nombre.
 * Si no hay match en el mapeo, no renderiza nada.
 */
export const CountryFlag = ({ name, size = 18, className = "" }: CountryFlagProps) => {
  const code = getCountryCode(name);
  if (!code) return null;
  const w = Math.round((size * 4) / 3);
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

/** Renderiza nombre de equipo: bandera (si hay match) + nombre. */
export const TeamName = ({ name, flagSize = 16, className = "" }: TeamNameProps) => {
  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <CountryFlag name={name} size={flagSize} />
      <span className="truncate">{name}</span>
    </span>
  );
};

// Compatibilidad: algunas pantallas todavía importan estos helpers.
// Como los nombres en DB ya no tienen emoji, devolvemos el texto tal cual.
export const stripFlagEmoji = (text: string): string => text ?? "";
export const extractCountryCode = (text: string): string | null => getCountryCode(text);
