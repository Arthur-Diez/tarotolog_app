const MAJOR_ARCANA_MAP: Record<string, string> = {
  "Шут (0)": "RWS_THE_FOOL",
  "Маг (1)": "RWS_THE_MAGICIAN",
  "Верховная Жрица (2)": "RWS_THE_HIGH_PRIESTESS",
  "Императрица (3)": "RWS_THE_EMPRESS",
  "Император (4)": "RWS_THE_EMPEROR",
  "Иерофант (5)": "RWS_THE_HIEROPHANT",
  "Влюбленные (6)": "RWS_THE_LOVERS",
  "Колесница (7)": "RWS_THE_CHARIOT",
  "Сила (8)": "RWS_STRENGTH",
  "Отшельник (9)": "RWS_THE_HERMIT",
  "Колесо Фортуны (10)": "RWS_WHEEL_OF_FORTUNE",
  "Справедливость (11)": "RWS_JUSTICE",
  "Повешенный (12)": "RWS_THE_HANGED_MAN",
  "Смерть (13)": "RWS_DEATH",
  "Умеренность (14)": "RWS_TEMPERANCE",
  "Дьявол (15)": "RWS_THE_DEVIL",
  "Башня (16)": "RWS_THE_TOWER",
  "Звезда (17)": "RWS_THE_STAR",
  "Луна (18)": "RWS_THE_MOON",
  "Солнце (19)": "RWS_THE_SUN",
  "Суд (20)": "RWS_JUDGEMENT",
  "Мир (21)": "RWS_THE_WORLD",
};

const SUITS_MAP: Record<string, string> = {
  Жезлов: "WANDS",
  Кубков: "CUPS",
  Мечей: "SWORDS",
  Пентаклей: "PENTACLES",
};

const RANKS_MAP: Record<string, string> = {
  Туз: "ACE",
  Двойка: "TWO",
  Тройка: "THREE",
  Четверка: "FOUR",
  Пятерка: "FIVE",
  Шестерка: "SIX",
  Семерка: "SEVEN",
  Восьмерка: "EIGHT",
  Девятка: "NINE",
  Десятка: "TEN",
  Паж: "PAGE",
  Рыцарь: "KNIGHT",
  Королева: "QUEEN",
  Король: "KING",
};

export function mapCardNameToCode(name: string): string | null {
  const trimmed = name.trim();
  const majorCode = MAJOR_ARCANA_MAP[trimmed];
  if (majorCode) {
    return majorCode;
  }

  const suitEntry = Object.entries(SUITS_MAP).find(([ruSuit]) => trimmed.endsWith(ruSuit));
  if (!suitEntry) {
    return null;
  }

  const [ruSuit, suitCode] = suitEntry;
  const rankPart = trimmed.slice(0, trimmed.length - ruSuit.length).trim();
  const rankCode = RANKS_MAP[rankPart];
  if (!rankCode) {
    return null;
  }

  return `RWS_${rankCode}_OF_${suitCode}`;
}

const EN_MINOR_SUITS: Record<string, string> = {
  WANDS: "WANDS",
  CUPS: "CUPS",
  SWORDS: "SWORDS",
  PENTACLES: "PENTACLES"
};

const EN_MINOR_RANKS: Record<string, string> = {
  ACE: "ACE",
  TWO: "TWO",
  THREE: "THREE",
  FOUR: "FOUR",
  FIVE: "FIVE",
  SIX: "SIX",
  SEVEN: "SEVEN",
  EIGHT: "EIGHT",
  NINE: "NINE",
  TEN: "TEN",
  PAGE: "PAGE",
  KNIGHT: "KNIGHT",
  QUEEN: "QUEEN",
  KING: "KING"
};

const EN_MAJOR_ARCANA_MAP: Record<string, string> = {
  FOOL: "RWS_THE_FOOL",
  MAGICIAN: "RWS_THE_MAGICIAN",
  "HIGH PRIESTESS": "RWS_THE_HIGH_PRIESTESS",
  EMPRESS: "RWS_THE_EMPRESS",
  EMPEROR: "RWS_THE_EMPEROR",
  HIEROPHANT: "RWS_THE_HIEROPHANT",
  LOVERS: "RWS_THE_LOVERS",
  CHARIOT: "RWS_THE_CHARIOT",
  STRENGTH: "RWS_STRENGTH",
  HERMIT: "RWS_THE_HERMIT",
  "WHEEL OF FORTUNE": "RWS_WHEEL_OF_FORTUNE",
  JUSTICE: "RWS_JUSTICE",
  "HANGED MAN": "RWS_THE_HANGED_MAN",
  DEATH: "RWS_DEATH",
  TEMPERANCE: "RWS_TEMPERANCE",
  DEVIL: "RWS_THE_DEVIL",
  TOWER: "RWS_THE_TOWER",
  STAR: "RWS_THE_STAR",
  MOON: "RWS_THE_MOON",
  SUN: "RWS_THE_SUN",
  JUDGEMENT: "RWS_JUDGEMENT",
  WORLD: "RWS_THE_WORLD"
};

function normalizeEnglishCardName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/^THE\s+/, "")
    .replace(/\s+/g, " ");
}

function mapEnglishCardNameToCode(name: string): string | null {
  const normalized = normalizeEnglishCardName(name);

  const major = EN_MAJOR_ARCANA_MAP[normalized];
  if (major) {
    return major;
  }

  const minorMatch = normalized.match(
    /^(ACE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|PAGE|KNIGHT|QUEEN|KING)\s+(?:OF\s+)?(WANDS|CUPS|SWORDS|PENTACLES)$/
  );
  if (!minorMatch) {
    return null;
  }
  const [, rankRaw, suitRaw] = minorMatch;
  const rank = EN_MINOR_RANKS[rankRaw];
  const suit = EN_MINOR_SUITS[suitRaw];
  if (!rank || !suit) {
    return null;
  }
  return `RWS_${rank}_OF_${suit}`;
}

export function mapCardValueToCode(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("RWS_")) return raw;
  return mapCardNameToCode(raw) ?? mapEnglishCardNameToCode(raw);
}
