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
  "Мир (21)": "RWS_THE_WORLD"
};

const SUITS_MAP: Record<string, string> = {
  Жезлов: "WANDS",
  Кубков: "CUPS",
  Мечей: "SWORDS",
  Пентаклей: "PENTACLES"
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
  Король: "KING"
};

const LENORMAND_CARDS: Array<{ index: number; name: string; slug: string }> = [
  { index: 1, name: "Всадник", slug: "RIDER" },
  { index: 2, name: "Клевер", slug: "CLOVER" },
  { index: 3, name: "Корабль", slug: "SHIP" },
  { index: 4, name: "Дом", slug: "HOUSE" },
  { index: 5, name: "Дерево", slug: "TREE" },
  { index: 6, name: "Тучи", slug: "CLOUDS" },
  { index: 7, name: "Змея", slug: "SNAKE" },
  { index: 8, name: "Гроб", slug: "COFFIN" },
  { index: 9, name: "Букет", slug: "BOUQUET" },
  { index: 10, name: "Коса", slug: "SCYTHE" },
  { index: 11, name: "Метла (Кнут)", slug: "WHIP" },
  { index: 12, name: "Птицы", slug: "BIRDS" },
  { index: 13, name: "Ребенок", slug: "CHILD" },
  { index: 14, name: "Лиса", slug: "FOX" },
  { index: 15, name: "Медведь", slug: "BEAR" },
  { index: 16, name: "Звезды", slug: "STARS" },
  { index: 17, name: "Аист", slug: "STORK" },
  { index: 18, name: "Собака", slug: "DOG" },
  { index: 19, name: "Башня", slug: "TOWER" },
  { index: 20, name: "Сад", slug: "GARDEN" },
  { index: 21, name: "Гора", slug: "MOUNTAIN" },
  { index: 22, name: "Развилка", slug: "CROSSROADS" },
  { index: 23, name: "Крысы", slug: "RATS" },
  { index: 24, name: "Сердце", slug: "HEART" },
  { index: 25, name: "Кольцо", slug: "RING" },
  { index: 26, name: "Книга", slug: "BOOK" },
  { index: 27, name: "Письмо", slug: "LETTER" },
  { index: 28, name: "Мужчина", slug: "MAN" },
  { index: 29, name: "Женщина", slug: "WOMAN" },
  { index: 30, name: "Лилии", slug: "LILIES" },
  { index: 31, name: "Солнце", slug: "SUN" },
  { index: 32, name: "Луна", slug: "MOON" },
  { index: 33, name: "Ключ", slug: "KEY" },
  { index: 34, name: "Рыбы", slug: "FISH" },
  { index: 35, name: "Якорь", slug: "ANCHOR" },
  { index: 36, name: "Крест", slug: "CROSS" }
];

const LENORMAND_NAME_ALIASES: Record<string, string> = {
  Метла: "Метла (Кнут)",
  Кнут: "Метла (Кнут)",
  "Башня (16)": "Башня"
};

const LENORMAND_NAME_TO_CODE: Record<string, string> = {};
const LENORMAND_INDEX_TO_CODE: Record<number, string> = {};
const LENORMAND_SLUG_TO_CODE: Record<string, string> = {};

LENORMAND_CARDS.forEach((card) => {
  const code = `LENORMAND_${String(card.index).padStart(2, "0")}_${card.slug}`;
  LENORMAND_NAME_TO_CODE[card.name] = code;
  LENORMAND_NAME_TO_CODE[`${card.name} (${card.index})`] = code;
  LENORMAND_INDEX_TO_CODE[card.index] = code;
  LENORMAND_SLUG_TO_CODE[card.slug] = code;
});

const EN_MINOR_SUITS: Record<string, string> = {
  WANDS: "WANDS",
  CUPS: "CUPS",
  SWORDS: "SWORDS",
  PENTACLES: "PENTACLES",
  PENTACLE: "PENTACLES"
};

const EN_MINOR_RANKS: Record<string, string> = {
  ACE: "ACE",
  "1": "ACE",
  TWO: "TWO",
  "2": "TWO",
  THREE: "THREE",
  "3": "THREE",
  FOUR: "FOUR",
  "4": "FOUR",
  FIVE: "FIVE",
  "5": "FIVE",
  SIX: "SIX",
  "6": "SIX",
  SEVEN: "SEVEN",
  "7": "SEVEN",
  EIGHT: "EIGHT",
  "8": "EIGHT",
  NINE: "NINE",
  "9": "NINE",
  TEN: "TEN",
  "10": "TEN",
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

type SupportedDeckId = "rws" | "lenormand";

const normalizeCardName = (value: string): string => value.trim().replace(/\s+/g, " ");

function mapRwsCardNameToCode(name: string): string | null {
  const majorCode = MAJOR_ARCANA_MAP[name];
  if (majorCode) {
    return majorCode;
  }

  const suitEntry = Object.entries(SUITS_MAP).find(([ruSuit]) => name.endsWith(ruSuit));
  if (!suitEntry) {
    return null;
  }

  const [ruSuit, suitCode] = suitEntry;
  const rankPart = name.slice(0, name.length - ruSuit.length).trim();
  const rankCode = RANKS_MAP[rankPart];
  if (!rankCode) {
    return null;
  }

  return `RWS_${rankCode}_OF_${suitCode}`;
}

function mapLenormandCardNameToCode(name: string): string | null {
  const aliasTarget = LENORMAND_NAME_ALIASES[name];
  const normalizedName = aliasTarget ?? name;
  return LENORMAND_NAME_TO_CODE[normalizedName] ?? null;
}

function normalizeEnglishCardName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\w\s]/g, " ")
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
    /^(ACE|[1-9]|10|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|PAGE|KNIGHT|QUEEN|KING)\s+(?:OF\s+)?(WANDS|CUPS|SWORDS|PENTACLES|PENTACLE)$/
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

function normalizeLenormandCode(rawCode: string): string | null {
  const normalized = rawCode
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/^LENORMAN_/, "LENORMAND_");

  if (!normalized.startsWith("LENORMAND_")) {
    return null;
  }

  const byNumberMatch = normalized.match(/^LENORMAND_(\d{1,2})(?:_|$)/);
  if (byNumberMatch) {
    const index = Number(byNumberMatch[1]);
    return LENORMAND_INDEX_TO_CODE[index] ?? null;
  }

  const bySlugMatch = normalized.match(/^LENORMAND_([A-Z_]+)$/);
  if (!bySlugMatch) {
    return null;
  }
  const slug = bySlugMatch[1];
  return LENORMAND_SLUG_TO_CODE[slug] ?? null;
}

export function mapCardNameToCode(name: string, deckId?: SupportedDeckId): string | null {
  const trimmed = normalizeCardName(name);
  if (!trimmed) return null;

  if (deckId === "rws") {
    return mapRwsCardNameToCode(trimmed) ?? mapEnglishCardNameToCode(trimmed);
  }

  if (deckId === "lenormand") {
    return mapLenormandCardNameToCode(trimmed);
  }

  return (
    mapRwsCardNameToCode(trimmed) ??
    mapLenormandCardNameToCode(trimmed) ??
    mapEnglishCardNameToCode(trimmed)
  );
}

export function mapCardValueToCode(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;

  if (raw.startsWith("RWS_")) {
    return raw;
  }

  const lenormandCode = normalizeLenormandCode(raw);
  if (lenormandCode) {
    return lenormandCode;
  }

  return mapCardNameToCode(raw);
}
