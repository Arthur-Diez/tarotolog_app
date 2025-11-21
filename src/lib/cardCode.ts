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
