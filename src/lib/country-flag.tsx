const FLAG_MAP: Record<string, string> = {
  "Alemania": "de",
  "Arabia Saudí": "sa",
  "Argelia": "dz",
  "Argentina": "ar",
  "Australia": "au",
  "Austria": "at",
  "Bélgica": "be",
  "Bosnia y Herzegovina": "ba",
  "Brasil": "br",
  "Canadá": "ca",
  "Catar": "qa",
  "República Checa": "cz",
  "Colombia": "co",
  "Costa de Marfil": "ci",
  "Croacia": "hr",
  "Curazao": "cw",
  "Ecuador": "ec",
  "EE. UU.": "us",
  "Egipto": "eg",
  "Escocia": "gb-sct",
  "España": "es",
  "Francia": "fr",
  "Ghana": "gh",
  "Haití": "ht",
  "Inglaterra": "gb-eng",
  "Irak": "iq",
  "Islas de Cabo Verde": "cv",
  "Japón": "jp",
  "Jordania": "jo",
  "Marruecos": "ma",
  "México": "mx",
  "Noruega": "no",
  "Nueva Zelanda": "nz",
  "Países Bajos": "nl",
  "Panamá": "pa",
  "Paraguay": "py",
  "Portugal": "pt",
  "RD Congo": "cd",
  "República de Corea": "kr",
  "RI de Irán": "ir",
  "Senegal": "sn",
  "Sudáfrica": "za",
  "Suecia": "se",
  "Suiza": "ch",
  "Túnez": "tn",
  "Turquía": "tr",
  "Uruguay": "uy",
  "Uzbekistán": "uz",
  "Por definir": null,
};

interface CountryFlagProps {
  name: string;
  size?: number;
  className?: string;
}

export const CountryFlag = ({ name, size = 18, className = "" }: CountryFlagProps) => {
  const code = FLAG_MAP[name.trim()];
  
  if (code === null) {
    // "Por definir" - mostrar icono de mundo neon
    return (
      <Globe
        className={`inline-block shrink-0 align-[-3px] text-primary ${className}`}
        style={{ width: size, height: size }}
        aria-label="Por definir"
      />
    );
  }
  
  if (!code) return null;
  
  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      srcSet={`https://flagcdn.com/48x36/${code}.png 2x`}
      width={24}
      height={18}
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
export const extractCountryCode = (text: string): string | null => FLAG_MAP[text?.trim()] ?? null;
