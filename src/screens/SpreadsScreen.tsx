import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
import CardBack from "@/components/tarot/CardBack";
import type { Deck, DeckSpread } from "@/data/decks";
import { ANGELS_SPREADS_MAP } from "@/data/angels_spreads";
import { LENORMAND_SPREADS_MAP } from "@/data/lenormand_spreads";
import { MANARA_SPREADS_MAP } from "@/data/manara_spreads";
import { RWS_SPREADS_MAP, type SpreadId } from "@/data/rws_spreads";
import { SPREAD_SCHEMAS } from "@/data/spreadSchemas";

interface SpreadsScreenProps {
  deck: Deck;
  onBack: () => void;
}

const isSpreadAvailableForDeck = (deckId: Deck["id"], spreadId: string): boolean => {
  const schema = SPREAD_SCHEMAS[spreadId as SpreadId];
  return Boolean(schema && schema.deckType === deckId);
};
type SpreadCategory = "popular" | "relationships" | "work_finance" | "self_growth" | "premium" | "forecast";

interface SpreadMeta {
  category: SpreadCategory;
  tags: string[];
  energyCost: number;
  popularityScore: number;
  keywords: string[];
}

interface SpreadBlock {
  id: SpreadCategory;
  title: string;
  badge?: string;
  spreadIds: string[];
}

const RWS_SPREAD_BLOCKS: SpreadBlock[] = [
  {
    id: "popular",
    title: "Популярные / Быстрые",
    badge: "🔥 Популярное",
    spreadIds: ["one_card", "yes_no", "three_cards", "cross", "five_cards"]
  },
  {
    id: "relationships",
    title: "Отношения",
    spreadIds: [
      "we_and_perspective",
      "relationship_analysis",
      "new_person",
      "love_triangle",
      "future_relationships",
      "conflict_reason",
      "will_he_return",
      "karmic_connection"
    ]
  },
  {
    id: "work_finance",
    title: "Работа и Финансы",
    spreadIds: [
      "work_current_situation",
      "change_job",
      "career_growth",
      "financial_flow",
      "new_project",
      "finances_period",
      "team_work",
      "vocation_profession"
    ]
  },
  {
    id: "self_growth",
    title: "Саморазвитие",
    spreadIds: ["inner_resource", "inner_conflict", "shadow_side", "hero_path", "balance_wheel", "reset_reload", "soul_purpose"]
  },
  {
    id: "premium",
    title: "Глубокие / Стратегические",
    badge: "👑 Премиум",
    spreadIds: ["celtic_cross", "wheel_of_year", "pyramid", "horseshoe", "star"]
  }
];

const LENORMAND_SPREAD_BLOCKS: SpreadBlock[] = [
  {
    id: "popular",
    title: "⚡ Быстрый ответ",
    badge: "🔥 Часто выбирают",
    spreadIds: ["lenormand_one_card", "lenormand_three_cards", "lenormand_yes_no"]
  },
  {
    id: "relationships",
    title: "❤️ Отношения",
    spreadIds: ["lenormand_we_and_connection", "lenormand_his_intentions", "lenormand_feelings_actions"]
  },
  {
    id: "work_finance",
    title: "💼 Работа и деньги",
    spreadIds: ["lenormand_work_money"]
  },
  {
    id: "forecast",
    title: "📅 Прогноз",
    spreadIds: ["lenormand_week", "lenormand_next_month", "lenormand_wheel_of_year"]
  },
  {
    id: "premium",
    title: "🔎 Глубокий анализ",
    badge: "👑 Премиум",
    spreadIds: ["lenormand_square_9", "lenormand_grand_tableau"]
  }
];

const MANARA_SPREAD_BLOCKS: SpreadBlock[] = [
  {
    id: "relationships",
    title: "❤️ Любовь и страсть",
    badge: "🔥 Основной блок",
    spreadIds: ["manara_mystery_love", "manara_love_check", "manara_two_hearts", "manara_relationship_future"]
  },
  {
    id: "self_growth",
    title: "💭 Намерения и психология",
    spreadIds: ["manara_his_intentions", "manara_feelings_actions"]
  },
  {
    id: "popular",
    title: "🧭 Ситуация и выбор",
    spreadIds: ["manara_three_cards", "manara_path"]
  },
  {
    id: "premium",
    title: "🔮 Глубокий анализ",
    badge: "👑 Премиум",
    spreadIds: ["manara_celtic_cross"]
  }
];

const ANGELS_SPREAD_BLOCKS: SpreadBlock[] = [
  {
    id: "popular",
    title: "✨ Послание и поддержка",
    badge: "🔥 Часто выбирают",
    spreadIds: ["angels_one_card", "angels_advice", "angels_yes_no_soft"]
  },
  {
    id: "self_growth",
    title: "🌿 Исцеление и внутреннее состояние",
    spreadIds: ["angels_balance_soul", "angels_healing_needed", "angels_body_spirit_energy"]
  },
  {
    id: "forecast",
    title: "🕊 Жизненный путь и предназначение",
    spreadIds: ["angels_soul_path", "angels_karmic_lesson", "angels_vector"]
  },
  {
    id: "relationships",
    title: "💞 Отношения под защитой",
    spreadIds: ["angels_relationship_support", "angels_union_harmony", "angels_higher_connection_meaning"]
  }
];

const RWS_SPREAD_META: Partial<Record<string, SpreadMeta>> = {
  one_card: { category: "popular", tags: ["день", "совет", "фокус"], energyCost: 5, popularityScore: 95, keywords: ["быстро", "карта дня"] },
  yes_no: { category: "popular", tags: ["выбор", "баланс", "итог"], energyCost: 10, popularityScore: 92, keywords: ["да", "нет"] },
  three_cards: { category: "popular", tags: ["прошлое", "настоящее", "будущее"], energyCost: 12, popularityScore: 90, keywords: ["динамика"] },
  cross: { category: "popular", tags: ["ситуация", "препятствие", "результат"], energyCost: 14, popularityScore: 88, keywords: ["структура"] },
  five_cards: { category: "popular", tags: ["слои", "совет", "итог"], energyCost: 16, popularityScore: 82, keywords: ["углублённый"] },
  we_and_perspective: { category: "relationships", tags: ["любовь", "партнёр", "перспектива"], energyCost: 14, popularityScore: 87, keywords: ["отношения"] },
  relationship_analysis: { category: "relationships", tags: ["чувства", "проблема", "потенциал"], energyCost: 18, popularityScore: 86, keywords: ["пара"] },
  new_person: { category: "relationships", tags: ["новое", "намерения", "риски"], energyCost: 16, popularityScore: 84, keywords: ["знакомство"] },
  love_triangle: { category: "relationships", tags: ["треугольник", "чувства", "выбор"], energyCost: 22, popularityScore: 83, keywords: ["третьи лица"] },
  future_relationships: { category: "relationships", tags: ["будущее", "урок", "итог"], energyCost: 17, popularityScore: 85, keywords: ["прогноз"] },
  conflict_reason: { category: "relationships", tags: ["конфликт", "роли", "решение"], energyCost: 18, popularityScore: 80, keywords: ["кризис"] },
  will_he_return: { category: "relationships", tags: ["возврат", "чувства", "шанс"], energyCost: 17, popularityScore: 89, keywords: ["после расставания"] },
  karmic_connection: { category: "relationships", tags: ["карма", "уроки", "предназначение"], energyCost: 22, popularityScore: 78, keywords: ["судьба"] },
  work_current_situation: { category: "work_finance", tags: ["работа", "фактор", "прогноз"], energyCost: 12, popularityScore: 82, keywords: ["карьера"] },
  change_job: { category: "work_finance", tags: ["работа", "плюсы", "риски"], energyCost: 16, popularityScore: 86, keywords: ["смена"] },
  career_growth: { category: "work_finance", tags: ["рост", "ресурс", "шанс"], energyCost: 18, popularityScore: 84, keywords: ["повышение"] },
  financial_flow: { category: "work_finance", tags: ["деньги", "утечки", "рост"], energyCost: 16, popularityScore: 88, keywords: ["доход"] },
  new_project: { category: "work_finance", tags: ["проект", "риски", "перспектива"], energyCost: 20, popularityScore: 81, keywords: ["бизнес"] },
  finances_period: { category: "work_finance", tags: ["деньги", "период", "совет"], energyCost: 16, popularityScore: 85, keywords: ["планирование"] },
  team_work: { category: "work_finance", tags: ["команда", "руководство", "итог"], energyCost: 17, popularityScore: 79, keywords: ["коллектив"] },
  vocation_profession: { category: "work_finance", tags: ["предназначение", "талант", "путь"], energyCost: 22, popularityScore: 83, keywords: ["профессия", "рост"] },
  inner_resource: { category: "self_growth", tags: ["энергия", "блок", "восстановление"], energyCost: 15, popularityScore: 82, keywords: ["выгорание"] },
  inner_conflict: { category: "self_growth", tags: ["выбор", "страх", "решение"], energyCost: 16, popularityScore: 80, keywords: ["кризис"] },
  shadow_side: { category: "self_growth", tags: ["тень", "подавление", "интеграция"], energyCost: 22, popularityScore: 76, keywords: ["психология"] },
  hero_path: { category: "self_growth", tags: ["путь", "урок", "уровень"], energyCost: 20, popularityScore: 77, keywords: ["трансформация"] },
  balance_wheel: { category: "self_growth", tags: ["баланс", "сферы", "гармония"], energyCost: 21, popularityScore: 81, keywords: ["системность"] },
  reset_reload: { category: "self_growth", tags: ["перезагрузка", "ресурс", "итог"], energyCost: 18, popularityScore: 83, keywords: ["перемены"] },
  soul_purpose: { category: "self_growth", tags: ["миссия", "дар", "путь"], energyCost: 23, popularityScore: 74, keywords: ["смысл"] },
  celtic_cross: { category: "premium", tags: ["глубокий", "анализ", "прогноз"], energyCost: 28, popularityScore: 93, keywords: ["классика"] },
  wheel_of_year: { category: "premium", tags: ["год", "цикл", "стратегия"], energyCost: 30, popularityScore: 90, keywords: ["12 карт"] },
  pyramid: { category: "premium", tags: ["уровни", "развитие", "итог"], energyCost: 24, popularityScore: 79, keywords: ["система"] },
  horseshoe: { category: "premium", tags: ["траектория", "окружение", "итог"], energyCost: 24, popularityScore: 75, keywords: ["подкова"] },
  star: { category: "premium", tags: ["энергия", "чакры", "гармония"], energyCost: 26, popularityScore: 73, keywords: ["диагностика"] }
};

const LENORMAND_SPREAD_META: Partial<Record<string, SpreadMeta>> = {
  lenormand_one_card: { category: "popular", tags: ["событие", "фокус", "день"], energyCost: 5, popularityScore: 95, keywords: ["быстро"] },
  lenormand_three_cards: { category: "popular", tags: ["цепочка", "развитие", "итог"], energyCost: 9, popularityScore: 91, keywords: ["ход событий"] },
  lenormand_yes_no: { category: "popular", tags: ["решение", "аргументы", "итог"], energyCost: 10, popularityScore: 90, keywords: ["фактический ответ"] },
  lenormand_we_and_connection: { category: "relationships", tags: ["связь", "партнёр", "перспектива"], energyCost: 15, popularityScore: 86, keywords: ["отношения"] },
  lenormand_his_intentions: { category: "relationships", tags: ["намерения", "чувства", "действия"], energyCost: 16, popularityScore: 88, keywords: ["он и вы"] },
  lenormand_feelings_actions: { category: "relationships", tags: ["эмоции", "поступки", "динамика"], energyCost: 16, popularityScore: 87, keywords: ["искренность"] },
  lenormand_work_money: { category: "work_finance", tags: ["доход", "риски", "результат"], energyCost: 17, popularityScore: 84, keywords: ["карьера"] },
  lenormand_week: { category: "forecast", tags: ["дни", "ритм", "план"], energyCost: 14, popularityScore: 82, keywords: ["неделя"] },
  lenormand_next_month: { category: "forecast", tags: ["месяц", "недели", "события"], energyCost: 18, popularityScore: 85, keywords: ["период"] },
  lenormand_wheel_of_year: { category: "forecast", tags: ["год", "месяцы", "цикл"], energyCost: 28, popularityScore: 81, keywords: ["стратегия"] },
  lenormand_square_9: { category: "premium", tags: ["детали", "анализ", "ситуация"], energyCost: 24, popularityScore: 79, keywords: ["9 карт"] },
  lenormand_grand_tableau: { category: "premium", tags: ["36 карт", "полный обзор", "судьба"], energyCost: 40, popularityScore: 76, keywords: ["grand tableau"] }
};

const MANARA_SPREAD_META: Partial<Record<string, SpreadMeta>> = {
  manara_mystery_love: {
    category: "relationships",
    tags: ["близость", "мысли", "страсть", "итог"],
    energyCost: 24,
    popularityScore: 91,
    keywords: ["любовь", "интимность"]
  },
  manara_love_check: {
    category: "relationships",
    tags: ["искренность", "намерения", "перспектива"],
    energyCost: 12,
    popularityScore: 88,
    keywords: ["проверка", "чувства"]
  },
  manara_two_hearts: {
    category: "relationships",
    tags: ["пара", "ожидания", "притяжение", "итог"],
    energyCost: 24,
    popularityScore: 86,
    keywords: ["два сердца", "совместимость"]
  },
  manara_relationship_future: {
    category: "relationships",
    tags: ["будущее", "динамика", "вклад", "перспектива"],
    energyCost: 26,
    popularityScore: 89,
    keywords: ["союз", "развитие"]
  },
  manara_his_intentions: {
    category: "self_growth",
    tags: ["намерение", "мысли", "действия", "психология"],
    energyCost: 16,
    popularityScore: 90,
    keywords: ["мотивация", "истина"]
  },
  manara_feelings_actions: {
    category: "self_growth",
    tags: ["эмоции", "поступки", "конфликт", "итог"],
    energyCost: 16,
    popularityScore: 89,
    keywords: ["чувства", "действия"]
  },
  manara_three_cards: {
    category: "popular",
    tags: ["причина", "развитие", "итог"],
    energyCost: 9,
    popularityScore: 85,
    keywords: ["быстрый", "ситуация"]
  },
  manara_path: {
    category: "popular",
    tags: ["траектория", "перелом", "совет", "итог"],
    energyCost: 18,
    popularityScore: 84,
    keywords: ["путь", "выбор"]
  },
  manara_celtic_cross: {
    category: "premium",
    tags: ["глубокий", "психология", "анализ", "итог"],
    energyCost: 30,
    popularityScore: 83,
    keywords: ["кельтский крест", "глубина"]
  }
};

const ANGELS_SPREAD_META: Partial<Record<string, SpreadMeta>> = {
  angels_one_card: {
    category: "popular",
    tags: ["поддержка", "послание", "ориентир"],
    energyCost: 5,
    popularityScore: 94,
    keywords: ["одна карта", "ангел"]
  },
  angels_advice: {
    category: "popular",
    tags: ["совет", "ситуация", "благословение"],
    energyCost: 10,
    popularityScore: 90,
    keywords: ["треугольник совета"]
  },
  angels_yes_no_soft: {
    category: "popular",
    tags: ["выбор", "мягкий ответ", "направление"],
    energyCost: 10,
    popularityScore: 88,
    keywords: ["да нет", "ответ свыше"]
  },
  angels_balance_soul: {
    category: "self_growth",
    tags: ["гармония", "душа", "восстановление"],
    energyCost: 16,
    popularityScore: 86,
    keywords: ["баланс души"]
  },
  angels_healing_needed: {
    category: "self_growth",
    tags: ["исцеление", "причина", "урок"],
    energyCost: 14,
    popularityScore: 84,
    keywords: ["что требует исцеления"]
  },
  angels_body_spirit_energy: {
    category: "self_growth",
    tags: ["тело", "дух", "ресурс", "баланс"],
    energyCost: 18,
    popularityScore: 83,
    keywords: ["энергия тела и духа"]
  },
  angels_soul_path: {
    category: "forecast",
    tags: ["предназначение", "путь", "итог"],
    energyCost: 20,
    popularityScore: 82,
    keywords: ["путь души"]
  },
  angels_karmic_lesson: {
    category: "forecast",
    tags: ["карма", "сценарий", "освобождение"],
    energyCost: 17,
    popularityScore: 80,
    keywords: ["кармический урок"]
  },
  angels_vector: {
    category: "forecast",
    tags: ["направление", "поддержка", "выбор"],
    energyCost: 16,
    popularityScore: 85,
    keywords: ["вектор развития"]
  },
  angels_relationship_support: {
    category: "relationships",
    tags: ["союз", "роль", "поддержка"],
    energyCost: 14,
    popularityScore: 81,
    keywords: ["отношения под защитой"]
  },
  angels_union_harmony: {
    category: "relationships",
    tags: ["гармония", "пара", "перспектива"],
    energyCost: 18,
    popularityScore: 83,
    keywords: ["гармония союза"]
  },
  angels_higher_connection_meaning: {
    category: "relationships",
    tags: ["кармический узел", "урок", "высший итог"],
    energyCost: 17,
    popularityScore: 79,
    keywords: ["высший смысл связи"]
  }
};

const getSpreadMeta = (spreadId: string, cardsCount: number, deckId: Deck["id"]): SpreadMeta => {
  const fallback: SpreadMeta = {
    category: "popular",
    tags: ["расклад", "анализ", "итог"],
    energyCost: Math.max(8, Math.round(cardsCount * 3)),
    popularityScore: 50,
    keywords: []
  };
  if (deckId === "lenormand") {
    return LENORMAND_SPREAD_META[spreadId] ?? fallback;
  }
  if (deckId === "manara") {
    return MANARA_SPREAD_META[spreadId] ?? fallback;
  }
  if (deckId === "angels") {
    return ANGELS_SPREAD_META[spreadId] ?? fallback;
  }
  return RWS_SPREAD_META[spreadId] ?? fallback;
};

const CATEGORY_LABELS: Record<SpreadCategory, string[]> = {
  popular: ["популярные", "быстрые", "fast", "popular"],
  relationships: ["отношения", "любовь", "relationship", "love"],
  work_finance: ["работа", "финансы", "деньги", "career", "finance"],
  self_growth: ["саморазвитие", "ресурс", "психология", "self", "growth"],
  premium: ["премиум", "глубокие", "стратегия", "premium"],
  forecast: ["прогноз", "месяц", "неделя", "год", "forecast"]
};

const matchesSpreadQuery = (spreadId: string, query: string, deckId: Deck["id"]): boolean => {
  const spread =
    deckId === "lenormand"
      ? LENORMAND_SPREADS_MAP[spreadId as keyof typeof LENORMAND_SPREADS_MAP]
      : deckId === "manara"
      ? MANARA_SPREADS_MAP[spreadId as keyof typeof MANARA_SPREADS_MAP]
      : deckId === "angels"
      ? ANGELS_SPREADS_MAP[spreadId as keyof typeof ANGELS_SPREADS_MAP]
      : RWS_SPREADS_MAP[spreadId as keyof typeof RWS_SPREADS_MAP];
  if (!spread) return false;
  const meta = getSpreadMeta(spreadId, spread.cardsCount, deckId);
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const cardsMatch = normalized.match(/(\d+)\s*карт(?:а|ы)?/);
  if (cardsMatch && Number(cardsMatch[1]) !== spread.cardsCount) {
    return false;
  }

  const categoryAliases = CATEGORY_LABELS[meta.category] ?? [];
  const haystack = [
    spread.title,
    spread.description,
    meta.category,
    ...categoryAliases,
    String(spread.cardsCount),
    ...meta.tags,
    ...meta.keywords
  ]
    .join(" ")
    .toLowerCase();

  const words = normalized.split(/\s+/).filter(Boolean);
  return words.every((word) => haystack.includes(word));
};

export function SpreadsScreen({ deck, onBack }: SpreadsScreenProps) {
  const [expandedSpreads, setExpandedSpreads] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const toggleSpread = (spreadId: string) => {
    setExpandedSpreads((prev) => ({
      ...prev,
      [spreadId]: !prev[spreadId]
    }));
    navigator.vibrate?.(10);
  };

  const handleSelectSpread = (spreadId: string) => {
    if (isSpreadAvailableForDeck(deck.id, spreadId)) {
      navigate(`/spreads/play/${spreadId}`);
      return;
    }

    alert("Этот расклад будет доступен позже");
  };

  const rwsBlocks = useMemo(() => {
    if (deck.id !== "rws") return [];
    return RWS_SPREAD_BLOCKS.map((block) => ({
      ...block,
      spreads: block.spreadIds
        .filter((spreadId) => matchesSpreadQuery(spreadId, query, deck.id))
        .map((spreadId) => ({
          id: spreadId,
          title: RWS_SPREADS_MAP[spreadId as keyof typeof RWS_SPREADS_MAP]?.title ?? spreadId,
          description: RWS_SPREADS_MAP[spreadId as keyof typeof RWS_SPREADS_MAP]?.description ?? ""
        }))
    })).filter((block) => block.spreads.length > 0);
  }, [deck.id, query]);

  const lenormandBlocks = useMemo(() => {
    if (deck.id !== "lenormand") return [];
    return LENORMAND_SPREAD_BLOCKS.map((block) => ({
      ...block,
      spreads: block.spreadIds
        .filter((spreadId) => matchesSpreadQuery(spreadId, query, deck.id))
        .map((spreadId) => ({
          id: spreadId,
          title: LENORMAND_SPREADS_MAP[spreadId as keyof typeof LENORMAND_SPREADS_MAP]?.title ?? spreadId,
          description: LENORMAND_SPREADS_MAP[spreadId as keyof typeof LENORMAND_SPREADS_MAP]?.description ?? ""
        }))
    })).filter((block) => block.spreads.length > 0);
  }, [deck.id, query]);

  const manaraBlocks = useMemo(() => {
    if (deck.id !== "manara") return [];
    return MANARA_SPREAD_BLOCKS.map((block) => ({
      ...block,
      spreads: block.spreadIds
        .filter((spreadId) => matchesSpreadQuery(spreadId, query, deck.id))
        .map((spreadId) => ({
          id: spreadId,
          title: MANARA_SPREADS_MAP[spreadId as keyof typeof MANARA_SPREADS_MAP]?.title ?? spreadId,
          description: MANARA_SPREADS_MAP[spreadId as keyof typeof MANARA_SPREADS_MAP]?.description ?? ""
        }))
    })).filter((block) => block.spreads.length > 0);
  }, [deck.id, query]);

  const angelsBlocks = useMemo(() => {
    if (deck.id !== "angels") return [];
    return ANGELS_SPREAD_BLOCKS.map((block) => ({
      ...block,
      spreads: block.spreadIds
        .filter((spreadId) => matchesSpreadQuery(spreadId, query, deck.id))
        .map((spreadId) => ({
          id: spreadId,
          title: ANGELS_SPREADS_MAP[spreadId as keyof typeof ANGELS_SPREADS_MAP]?.title ?? spreadId,
          description: ANGELS_SPREADS_MAP[spreadId as keyof typeof ANGELS_SPREADS_MAP]?.description ?? ""
        }))
    })).filter((block) => block.spreads.length > 0);
  }, [deck.id, query]);

  const nonRwsSpreads = useMemo(() => {
    if (deck.id === "rws" || deck.id === "lenormand" || deck.id === "manara" || deck.id === "angels") return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return deck.spreads;
    return deck.spreads.filter((spread) => `${spread.title} ${spread.description}`.toLowerCase().includes(normalized));
  }, [deck.id, deck.spreads, query]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-tertiary)] transition hover:text-[var(--text-secondary)]"
          >
            ← Назад
          </button>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{deck.title}</h2>
          {deck.subtitle ? <p className="text-xs text-[var(--text-secondary)]">{deck.subtitle}</p> : null}
        </div>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Поиск: любовь, деньги, кризис, 3 карты..."
          className="h-11 w-full rounded-2xl border border-white/10 bg-[var(--bg-card)] pl-10 pr-4 text-sm text-[var(--text-primary)] shadow-[0_0_24px_rgba(140,90,255,0.2)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]"
        />
      </div>

      {deck.id === "rws" ? (
        <div className="space-y-6">
          {rwsBlocks.map((block) => (
            <section key={block.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{block.title}</h3>
                {block.badge ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                    {block.badge}
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                {block.spreads.map((spread) => (
                  <SpreadCard
                    key={spread.id}
                    spread={spread}
                    deckId={deck.id}
                    expanded={Boolean(expandedSpreads[spread.id])}
                    onToggle={() => toggleSpread(spread.id)}
                    onSelect={() => handleSelectSpread(spread.id)}
                    canSelect={isSpreadAvailableForDeck(deck.id, spread.id)}
                  />
                ))}
              </div>
            </section>
          ))}
          {rwsBlocks.length === 0 ? (
            <Card className="rounded-[20px] border border-white/10 bg-[var(--bg-card)]/70 p-4 text-sm text-[var(--text-secondary)]">
              Ничего не найдено. Попробуйте запрос по названию, теме или количеству карт.
            </Card>
          ) : null}
        </div>
      ) : deck.id === "lenormand" ? (
        <div className="space-y-6">
          {lenormandBlocks.map((block) => (
            <section key={block.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{block.title}</h3>
                {block.badge ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                    {block.badge}
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                {block.spreads.map((spread) => (
                  <SpreadCard
                    key={spread.id}
                    spread={spread}
                    deckId={deck.id}
                    expanded={Boolean(expandedSpreads[spread.id])}
                    onToggle={() => toggleSpread(spread.id)}
                    onSelect={() => handleSelectSpread(spread.id)}
                    canSelect={isSpreadAvailableForDeck(deck.id, spread.id)}
                  />
                ))}
              </div>
            </section>
          ))}
          {lenormandBlocks.length === 0 ? (
            <Card className="rounded-[20px] border border-white/10 bg-[var(--bg-card)]/70 p-4 text-sm text-[var(--text-secondary)]">
              Ничего не найдено. Попробуйте запрос по теме или количеству карт.
            </Card>
          ) : null}
        </div>
      ) : deck.id === "manara" ? (
        <div className="space-y-6">
          {manaraBlocks.map((block) => (
            <section key={block.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{block.title}</h3>
                {block.badge ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                    {block.badge}
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                {block.spreads.map((spread) => (
                  <SpreadCard
                    key={spread.id}
                    spread={spread}
                    deckId={deck.id}
                    expanded={Boolean(expandedSpreads[spread.id])}
                    onToggle={() => toggleSpread(spread.id)}
                    onSelect={() => handleSelectSpread(spread.id)}
                    canSelect={isSpreadAvailableForDeck(deck.id, spread.id)}
                  />
                ))}
              </div>
            </section>
          ))}
          {manaraBlocks.length === 0 ? (
            <Card className="rounded-[20px] border border-white/10 bg-[var(--bg-card)]/70 p-4 text-sm text-[var(--text-secondary)]">
              Ничего не найдено. Попробуйте запрос по теме или количеству карт.
            </Card>
          ) : null}
        </div>
      ) : deck.id === "angels" ? (
        <div className="space-y-6">
          {angelsBlocks.map((block) => (
            <section key={block.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{block.title}</h3>
                {block.badge ? (
                  <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/90">
                    {block.badge}
                  </span>
                ) : null}
              </div>
              <div className="space-y-3">
                {block.spreads.map((spread) => (
                  <SpreadCard
                    key={spread.id}
                    spread={spread}
                    deckId={deck.id}
                    expanded={Boolean(expandedSpreads[spread.id])}
                    onToggle={() => toggleSpread(spread.id)}
                    onSelect={() => handleSelectSpread(spread.id)}
                    canSelect={isSpreadAvailableForDeck(deck.id, spread.id)}
                  />
                ))}
              </div>
            </section>
          ))}
          {angelsBlocks.length === 0 ? (
            <Card className="rounded-[20px] border border-white/10 bg-[var(--bg-card)]/70 p-4 text-sm text-[var(--text-secondary)]">
              Ничего не найдено. Попробуйте запрос по теме или количеству карт.
            </Card>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {nonRwsSpreads.map((spread) => (
            <SpreadCard
              key={spread.id}
              spread={spread}
              deckId={deck.id}
              expanded={Boolean(expandedSpreads[spread.id])}
              onToggle={() => toggleSpread(spread.id)}
              onSelect={() => handleSelectSpread(spread.id)}
              canSelect={isSpreadAvailableForDeck(deck.id, spread.id)}
            />
          ))}
          {nonRwsSpreads.length === 0 ? (
            <Card className="rounded-[20px] border border-white/10 bg-[var(--bg-card)]/70 p-4 text-sm text-[var(--text-secondary)]">
              Ничего не найдено. Уточните запрос.
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

interface SpreadCardProps {
  spread: DeckSpread;
  deckId: Deck["id"];
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  canSelect: boolean;
}

interface SpreadDetailsContent {
  subtitle: string;
  metaLine: string;
  header: string;
  purpose: string[];
  howItWorks: string[];
  forWhom: string[];
}

const RWS_SPREAD_DETAILS: Record<string, SpreadDetailsContent> = {
  one_card: {
    subtitle: "Послание дня и энергия момента",
    metaLine: "1 карта · энергия · фокус · совет",
    header: "Одна карта",
    purpose: [
      "🔮 Понять энергию дня",
      "⚡ Получить совет или предупреждение",
      "🌙 Увидеть шанс или урок"
    ],
    howItWorks: ["🃏 1 карта = 1 ключевое послание", "Фокус на теме дня и внимании"],
    forWhom: ["✓ Новичкам", "✓ Когда нужен быстрый ответ"]
  },
  yes_no: {
    subtitle: "Быстрый ориентир по вопросу",
    metaLine: "3 карты · баланс факторов · итог",
    header: "Да или Нет",
    purpose: [
      "⚖️ Взвесить аргументы «за» и «против»",
      "🧭 Понять текущее направление ситуации",
      "🔎 Получить ясный итог по запросу"
    ],
    howItWorks: ["🃏 3 карты: фактор ДА, фактор НЕТ, итог", "Сначала анализ причин, затем вывод"],
    forWhom: ["✓ Когда нужен четкий ориентир", "✓ Для решений с ограниченным сроком"]
  },
  three_cards: {
    subtitle: "Прошлое, настоящее, будущее",
    metaLine: "3 карты · динамика событий · развитие",
    header: "Три карты",
    purpose: [
      "🕰️ Увидеть связь прошлого с текущим моментом",
      "🎯 Понять, куда ведет текущая линия",
      "✨ Найти ключевую точку влияния на будущее"
    ],
    howItWorks: ["🃏 3 позиции: прошлое, настоящее, будущее", "Фокус на причинно-следственной цепочке"],
    forWhom: ["✓ Для регулярной самодиагностики", "✓ Когда важно понять контекст ситуации"]
  },
  cross: {
    subtitle: "Ситуация, препятствие, поддержка, итог",
    metaLine: "4 карты · структура проблемы · решение",
    header: "Крест",
    purpose: [
      "🧩 Разложить ситуацию на ключевые блоки",
      "🛡️ Выявить, что мешает и что поддерживает",
      "🏁 Оценить реалистичный результат"
    ],
    howItWorks: ["🃏 4 позиции: суть, против, поддержка, результат", "Позволяет увидеть точку разворота"],
    forWhom: ["✓ Когда есть внутренний конфликт", "✓ Для выбора стратегии действий"]
  },
  five_cards: {
    subtitle: "Глубже о ситуации и векторе",
    metaLine: "5 карт · слои влияния · рекомендация",
    header: "Пятикарточный расклад",
    purpose: [
      "🔍 Уточнить скрытые факторы и фон",
      "📌 Получить практичный совет",
      "🚦Понять, к чему ведут текущие шаги"
    ],
    howItWorks: ["🃏 5 позиций: прошлое, настоящее, скрытые влияния, совет, итог", "Баланс анализа и прогноза"],
    forWhom: ["✓ Когда «трех карт» уже мало", "✓ Для решений со средней сложностью"]
  },
  horseshoe: {
    subtitle: "Последовательность от прошлого к итогу",
    metaLine: "7 карт · путь ситуации · стратегический обзор",
    header: "Подкова",
    purpose: [
      "🛤️ Проследить ход событий по этапам",
      "⚠️ Отдельно увидеть риски и окружение",
      "🗝️ Найти лучший следующий шаг"
    ],
    howItWorks: ["🃏 7 позиций: от прошлого к результату", "Показывает траекторию и точки коррекции"],
    forWhom: ["✓ Для длительных и запутанных тем", "✓ Когда важно видеть картину целиком"]
  },
  star: {
    subtitle: "Энергетическая диагностика по чакрам",
    metaLine: "7 карт · ресурс и блоки · гармонизация",
    header: "Звезда",
    purpose: [
      "🌈 Понять, где ресурсы, а где перегруз",
      "🧘 Определить зону внутреннего дисбаланса",
      "💡 Получить мягкий фокус на восстановление"
    ],
    howItWorks: ["🃏 7 позиций: каждая карта связана с чакрой", "Формирует карту внутреннего состояния"],
    forWhom: ["✓ Для тем самочувствия и состояния", "✓ Для глубокой внутренней работы"]
  },
  pyramid: {
    subtitle: "От основания к вершине",
    metaLine: "6 карт · последовательный рост · итог",
    header: "Пирамида",
    purpose: [
      "🏗️ Структурировать тему по уровням",
      "🧠 Разделить внешнее и внутреннее влияние",
      "🎯 Увидеть логичный выход в результат"
    ],
    howItWorks: ["🃏 6 позиций, разложенных ступенчато", "Каждый уровень уточняет следующий"],
    forWhom: ["✓ Для комплексных вопросов развития", "✓ Когда нужен системный взгляд"]
  },
  celtic_cross: {
    subtitle: "Классический глубокий расклад",
    metaLine: "10 карт · многослойный анализ · сильный прогноз",
    header: "Кельтский крест",
    purpose: [
      "🧭 Получить объемную картину ситуации",
      "🧱 Понять внутренние и внешние причины",
      "📈 Увидеть вероятный исход и роль человека"
    ],
    howItWorks: ["🃏 Центральный крест + правая колонна из 4 карт", "Сочетает анализ настоящего и вектора будущего"],
    forWhom: ["✓ Для серьезных жизненных вопросов", "✓ Когда нужен глубокий разбор, а не быстрый ответ"]
  },
  wheel_of_year: {
    subtitle: "Годовой обзор по 12 сферам",
    metaLine: "12 карт · цикл года · возможности и риски",
    header: "Колесо года",
    purpose: [
      "📅 Составить карту года по главным темам",
      "💼 Оценить работу, финансы, отношения, ресурсы",
      "🔭 Выделить риск, поддержку и главный итог"
    ],
    howItWorks: [
      "🃏 12 позиций: от общей темы до итоговой точки года",
      "Расклад дает стратегический ориентир на длительный период"
    ],
    forWhom: ["✓ Для планирования года", "✓ Для приоритизации целей и решений"]
  },
  we_and_perspective: {
    subtitle: "Вы, партнёр и вектор связи",
    metaLine: "3 карты · баланс · динамика · прогноз",
    header: "Мы и перспектива",
    purpose: [
      "💞 Быстро увидеть баланс между вами",
      "🧭 Понять текущее состояние партнёра",
      "🔮 Оценить ближайшую перспективу отношений"
    ],
    howItWorks: ["🃏 3 позиции: вы, партнёр, перспектива", "Расклад даёт короткий и ясный срез динамики связи"],
    forWhom: ["✓ Для стартовой проверки отношений", "✓ Когда нужен ответ без перегруза"]
  },
  relationship_analysis: {
    subtitle: "Глубокий разбор пары",
    metaLine: "5 карт · чувства · проблема · итог",
    header: "Анализ отношений",
    purpose: [
      "💗 Понять взаимные чувства",
      "⚖️ Выявить ключевую проблему",
      "🔮 Оценить потенциал и развитие"
    ],
    howItWorks: [
      "🃏 5 позиций: ваши чувства, чувства партнёра, проблема, потенциал, итог",
      "Расклад раскрывает скрытую динамику и перспективу союза"
    ],
    forWhom: ["✓ Для серьёзного анализа пары", "✓ Когда отношения требуют ясности"]
  },
  new_person: {
    subtitle: "Кто он и что принесёт",
    metaLine: "5 карт · намерения · риски · перспектива",
    header: "Новый человек",
    purpose: [
      "✨ Понять намерения нового партнёра",
      "🧭 Оценить влияние на вашу жизнь",
      "⚠️ Увидеть возможные риски"
    ],
    howItWorks: ["🃏 5 позиций: личность, намерения, влияние, риски, итог", "Расклад показывает реальный потенциал новой связи"],
    forWhom: ["✓ При начале общения", "✓ Когда важно понять серьёзность намерений"]
  },
  love_triangle: {
    subtitle: "Три стороны ситуации",
    metaLine: "7 карт · чувства · скрытая динамика · итог",
    header: "Любовный треугольник",
    purpose: [
      "💔 Понять расстановку чувств",
      "🔍 Выявить скрытые мотивы",
      "⚖️ Увидеть реальный итог ситуации"
    ],
    howItWorks: ["🃏 7 позиций: участники, чувства, скрытая динамика, итог", "Расклад раскрывает баланс сил и перспективу выбора"],
    forWhom: ["✓ В сложных эмоциональных ситуациях", "✓ Когда важно увидеть всю картину"]
  },
  future_relationships: {
    subtitle: "Прогноз развития союза",
    metaLine: "5 карт · динамика · урок · итог",
    header: "Будущее отношений",
    purpose: [
      "🔮 Оценить перспективу пары",
      "🧭 Понять ключевой урок связи",
      "🌿 Увидеть направление развития"
    ],
    howItWorks: [
      "🃏 5 позиций: текущее состояние, ближайшее будущее, урок, укрепляющий фактор, итог",
      "Расклад показывает вектор развития отношений"
    ],
    forWhom: ["✓ Для планирования будущего", "✓ Когда важно понять серьёзность связи"]
  },
  conflict_reason: {
    subtitle: "Корень проблемы в паре",
    metaLine: "5 карт · роли · блок · решение",
    header: "Причина конфликта",
    purpose: [
      "⚡ Выявить источник напряжения",
      "🧠 Понять свою и партнёрскую роль",
      "🌿 Найти путь к решению"
    ],
    howItWorks: ["🃏 5 позиций: корень, ваша роль, роль партнёра, блок, решение", "Расклад помогает структурировать конфликт и увидеть выход"],
    forWhom: ["✓ В период недопонимания", "✓ Когда нужен честный анализ ситуации"]
  },
  will_he_return: {
    subtitle: "Шанс на восстановление связи",
    metaLine: "5 карт · чувства · намерения · итог",
    header: "Вернётся ли человек?",
    purpose: [
      "💔 Понять чувства партнёра",
      "🔮 Оценить вероятность возврата",
      "🧭 Увидеть факторы влияния"
    ],
    howItWorks: ["🃏 5 позиций: чувства, намерения, шанс, влияние, итог", "Расклад показывает реальную перспективу восстановления"],
    forWhom: ["✓ После расставания", "✓ Когда есть неопределённость"]
  },
  karmic_connection: {
    subtitle: "Глубинная природа отношений",
    metaLine: "7 карт · уроки · риски · предназначение",
    header: "Кармическая связь",
    purpose: [
      "🌀 Понять смысл и тип связи",
      "📖 Осознать уроки союза",
      "⚖️ Оценить потенциал и риски"
    ],
    howItWorks: [
      "🃏 7 позиций: тип связи, уроки для каждого, плюсы, минусы, предназначение",
      "Расклад раскрывает глубинную энергетику отношений"
    ],
    forWhom: ["✓ Для серьёзных и судьбоносных связей", "✓ Когда хочется понять глубинный смысл отношений"]
  },
  work_current_situation: {
    subtitle: "Быстрый срез того, что происходит",
    metaLine: "3 карты · динамика · фактор · прогноз",
    header: "Текущая рабочая ситуация",
    purpose: [
      "💼 Понять рабочий фон и настроение",
      "🔍 Увидеть то, что влияет “за кулисами”",
      "🔮 Оценить ближайшее развитие событий"
    ],
    howItWorks: ["🃏 3 позиции: текущее → скрытый фактор → ближайшее развитие", "Расклад даёт ясную картину и направление"],
    forWhom: ["✓ Когда нужен быстрый ориентир", "✓ Если чувствуете неопределённость на работе"]
  },
  change_job: {
    subtitle: "Рациональное решение без эмоций",
    metaLine: "5 карт · плюсы/минусы · возможности · итог",
    header: "Стоит ли менять работу?",
    purpose: ["⚖️ Взвесить “за” и “против”", "⚠️ Увидеть реальные риски", "🔮 Понять наиболее вероятный итог"],
    howItWorks: [
      "🃏 5 позиций: текущая точка, плюсы, минусы, возможности, итог",
      "Расклад помогает принять решение более уверенно"
    ],
    forWhom: ["✓ Перед увольнением/переходом", "✓ Если сомневаетесь и нужен ясный план"]
  },
  career_growth: {
    subtitle: "Путь вверх: блоки и ресурсы",
    metaLine: "5 карт · потенциал · шаги · результат",
    header: "Карьерный рост",
    purpose: ["🚀 Оценить перспективу продвижения", "🔍 Понять, что тормозит рост", "🌿 Найти ресурс и правильный шаг"],
    howItWorks: ["🃏 5 позиций “ступенями”: потенциал → препятствие → ресурс → шанс → итог", "Расклад показывает стратегию развития"],
    forWhom: ["✓ Тем, кто хочет повышение", "✓ При выборе направления развития"]
  },
  financial_flow: {
    subtitle: "Диагностика денег и утечек",
    metaLine: "5 карт · источник · блок · рост · итог",
    header: "Финансовый поток",
    purpose: ["💰 Понять, откуда идут деньги", "⚠️ Найти утечки и блоки", "📈 Увидеть точку роста дохода"],
    howItWorks: ["🃏 5 позиций “потоком”: источник → блок → скрытое → рост → итог", "Расклад даёт понятный план усиления финансов"],
    forWhom: ["✓ При нестабильном доходе", "✓ Когда хотите увеличить прибыль"]
  },
  new_project: {
    subtitle: "Проверка идеи перед запуском",
    metaLine: "6 карт · потенциал · риски · перспектива",
    header: "Новый проект",
    purpose: ["💡 Оценить жизнеспособность идеи", "⚠️ Увидеть слабые места заранее", "📈 Понять перспективу и стратегию"],
    howItWorks: [
      "🃏 6 позиций “строительством”: идея, рынок, ресурсы, риски, конкуренция, итог",
      "Расклад помогает решить — запускать или доработать"
    ],
    forWhom: ["✓ Перед стартом проекта", "✓ Когда выбираете, во что вложиться"]
  },
  finances_period: {
    subtitle: "Куда пойдут деньги в ближайшее время",
    metaLine: "5 карт · тенденция · риск · совет · итог",
    header: "Финансы на период",
    purpose: ["📅 Понять общую финансовую динамику", "⚠️ Предупредить потери", "🧭 Получить практичный совет"],
    howItWorks: ["🃏 5 позиций “по времени”: тенденция → шанс → риск → совет → итог", "Расклад даёт ориентир на ближайший период"],
    forWhom: ["✓ Для планирования трат/доходов", "✓ Перед важными финансовыми шагами"]
  },
  team_work: {
    subtitle: "Вы в системе: роли и влияние",
    metaLine: "5 карт · команда · руководство · итог",
    header: "Работа в коллективе",
    purpose: ["👥 Понять своё место в команде", "🔍 Увидеть скрытую динамику", "⚖️ Оценить перспективы взаимодействия"],
    howItWorks: ["🃏 5 позиций вокруг центра: вы, руководство, коллеги, скрытое, итог", "Расклад помогает выбрать стратегию поведения"],
    forWhom: ["✓ При напряжении или конфликте", "✓ Перед переговорами/сменой роли"]
  },
  vocation_profession: {
    subtitle: "Глубокий разбор сильных сторон",
    metaLine: "7 карт · талант · путь · итог",
    header: "Предназначение и профессия",
    purpose: ["🌟 Осознать, в чём ваш талант", "🧭 Найти правильный профессиональный вектор", "📈 Понять, куда лучше направить усилия"],
    howItWorks: [
      "🃏 7 позиций “звездой”: ядро, талант, ресурс, препятствие, направление, поддержка, итог",
      "Расклад раскрывает стратегию реализации"
    ],
    forWhom: ["✓ При смене профессии", "✓ Когда хочется найти “своё” дело"]
  },
  inner_resource: {
    subtitle: "Где ваша сила и как её восстановить",
    metaLine: "5 карт · энергия · блок · восстановление",
    header: "Внутренний ресурс",
    purpose: ["🌿 Понять, что даёт вам энергию", "⚠️ Увидеть, что истощает", "✨ Найти способ восстановить баланс"],
    howItWorks: ["🃏 5 позиций вокруг центра силы", "Расклад раскрывает ваши внутренние источники энергии"],
    forWhom: ["✓ При усталости и выгорании", "✓ Когда нужно восстановиться"]
  },
  inner_conflict: {
    subtitle: "Разобраться в себе и принять решение",
    metaLine: "5 карт · сознание · страх · выход",
    header: "Внутренний конфликт",
    purpose: ["🧠 Понять противоречия", "🔍 Осознать скрытые желания", "⚖️ Найти точку равновесия"],
    howItWorks: ["🃏 5 позиций раскрывают конфликт между разумом и чувствами", "Помогает увидеть глубинную причину напряжения"],
    forWhom: ["✓ При сложном выборе", "✓ Когда ощущаете внутреннее напряжение"]
  },
  shadow_side: {
    subtitle: "Скрытые аспекты личности",
    metaLine: "7 карт · страх · подавление · интеграция",
    header: "Теневая сторона",
    purpose: ["🌑 Понять подавленные качества", "🔍 Осознать внутренние страхи", "✨ Интегрировать “тень”"],
    howItWorks: ["🃏 7 позиций раскрывают уровень сознания и глубинные слои психики", "Расклад помогает принять непризнанные стороны себя"],
    forWhom: ["✓ Для глубокой психологической работы", "✓ В период внутреннего кризиса"]
  },
  hero_path: {
    subtitle: "Ваш этап трансформации",
    metaLine: "7 карт · вызов · урок · новый уровень",
    header: "Путь героя",
    purpose: ["🧭 Понять свой жизненный этап", "⚡ Осознать вызов", "🌟 Увидеть новый уровень развития"],
    howItWorks: ["🃏 7 позиций формируют путь от старого к новому", "Расклад показывает этап личной трансформации"],
    forWhom: ["✓ В переходные периоды", "✓ Когда ощущается важный жизненный этап"]
  },
  balance_wheel: {
    subtitle: "Баланс сфер жизни",
    metaLine: "8 карт · перекос · гармония · внимание",
    header: "Колесо баланса",
    purpose: ["⚖️ Увидеть перекос в жизни", "🔍 Понять, где не хватает энергии", "🌿 Восстановить гармонию"],
    howItWorks: ["🃏 8 позиций отражают основные сферы жизни", "Расклад показывает баланс и точки роста"],
    forWhom: ["✓ При ощущении хаоса", "✓ Когда хочется системности"]
  },
  reset_reload: {
    subtitle: "Начало нового этапа",
    metaLine: "6 карт · завершение · ресурс · итог",
    header: "Перезагрузка",
    purpose: ["🔄 Осознать завершение этапа", "🌿 Отпустить лишнее", "🚀 Определить новый фокус"],
    howItWorks: ["🃏 6 позиций разделяют прошлое и будущее", "Расклад помогает начать новый этап осознанно"],
    forWhom: ["✓ В период перемен", "✓ При ощущении застоя"]
  },
  soul_purpose: {
    subtitle: "Глубинный вектор жизни",
    metaLine: "7 карт · талант · урок · путь",
    header: "Предназначение души",
    purpose: ["🌟 Осознать свою миссию", "🔍 Увидеть кармический урок", "🧭 Найти направление развития"],
    howItWorks: ["🃏 7 позиций раскрывают предназначение через сильные и слабые стороны", "Расклад помогает понять стратегию жизни"],
    forWhom: ["✓ При поиске смысла", "✓ В период духовного роста"]
  }
};

const LENORMAND_SPREAD_DETAILS: Record<string, SpreadDetailsContent> = {
  lenormand_one_card: {
    subtitle: "Ключевое событие или тема дня",
    metaLine: "1 карта · главное событие · ключевой фокус",
    header: "Одна карта (Событие дня)",
    purpose: ["📅 Понять, что станет главным сегодня", "🧭 Уловить направление дня", "⚡ Получить быстрый ориентир"],
    howItWorks: ["🃏 1 позиция — событие или влияние, которое проявится ярче всего.", "Расклад даёт краткий и конкретный прогноз."],
    forWhom: ["✓ Для ежедневного прогноза", "✓ Когда нужен быстрый ответ"]
  },
  lenormand_three_cards: {
    subtitle: "Цепочка развития событий",
    metaLine: "3 карты · текущая ситуация · развитие · итог",
    header: "Три карты (Ход событий)",
    purpose: ["📈 Понять, как будут развиваться события", "🔎 Увидеть причинно-следственную связь", "🧭 Считать вероятный итог"],
    howItWorks: ["🃏 Первая карта — исходная точка, вторая — движение процесса, третья — вероятный результат.", "Показывает логику события по шагам."],
    forWhom: ["✓ Для прогноза на ближайшее время", "✓ Когда важна динамика, а не моментальный ответ"]
  },
  lenormand_yes_no: {
    subtitle: "Фактический ответ с контекстом",
    metaLine: "3 карты · аргументы · итоговое направление",
    header: "Да или Нет (Фактический ответ)",
    purpose: ["⚖️ Взвесить ситуацию без иллюзий", "🧭 Получить чёткий ориентир", "🔍 Понять, что влияет на итог"],
    howItWorks: ["🃏 Левая карта — «за», верхняя — главный фактор, правая — «против/итог».", "Итог читается через баланс аргументов."],
    forWhom: ["✓ Когда нужно принять решение", "✓ Когда важна конкретика"]
  },
  lenormand_his_intentions: {
    subtitle: "Мысли, чувства, реальные действия",
    metaLine: "5 карт · мысли · чувства · намерение · действия · итог",
    header: "Его намерения",
    purpose: ["💬 Понять, серьёзен ли человек", "🔎 Отличить слова от намерений", "❤️ Увидеть скрытые мотивы"],
    howItWorks: ["🃏 Центральная карта показывает истинное намерение. Верхняя — эмоции, левая — мысли, правая — действия, нижняя — к чему это ведёт.", "Расклад даёт конкретный ответ о перспективах взаимодействия."],
    forWhom: ["✓ Когда есть сомнения", "✓ Если поведение человека противоречиво"]
  },
  lenormand_feelings_actions: {
    subtitle: "Баланс эмоций и поступков",
    metaLine: "5 карт · чувства · намерения · действия · развитие",
    header: "Чувства и действия",
    purpose: ["❤️ Разобраться в искренности", "⚖️ Сравнить чувства и поступки", "🔎 Понять динамику отношений"],
    howItWorks: ["🃏 Верхний ряд — внутренний мир человека, нижний — проявление во внешнем мире, центр — ключевое влияние.", "Помогает увидеть расхождения между словами и действиями."],
    forWhom: ["✓ Когда важна ясность", "✓ Если отношения нестабильны"]
  },
  lenormand_we_and_connection: {
    subtitle: "Вы, партнёр и динамика связи",
    metaLine: "5 карт · вы · партнёр · связь · препятствие · перспектива",
    header: "Мы и связь",
    purpose: ["❤️ Понять динамику отношений", "🔎 Увидеть сильные и слабые стороны связи", "🧭 Оценить перспективу"],
    howItWorks: ["🃏 Центр показывает характер связи, нижние карты раскрывают развитие и препятствия.", "Расклад даёт практичный взгляд на будущее отношений."],
    forWhom: ["✓ Для анализа чувств", "✓ При сомнениях в будущем пары"]
  },
  lenormand_work_money: {
    subtitle: "Практичный прогноз по карьере и доходу",
    metaLine: "5 карт · доход · возможности · риски · результат",
    header: "Работа и деньги",
    purpose: ["💼 Оценить карьерную ситуацию", "💰 Понять перспективы дохода", "⚠️ Считать риски заранее"],
    howItWorks: ["🃏 Центральная карта — финансовый поток, верхняя — шанс, нижняя — итог развития.", "Даёт прикладной прогноз без абстракций."],
    forWhom: ["✓ Для анализа работы", "✓ При финансовых вопросах"]
  },
  lenormand_week: {
    subtitle: "Недельный ритм по дням",
    metaLine: "7 карт · прогноз по дням недели",
    header: "Неделя",
    purpose: ["📆 Спланировать неделю", "📌 Подготовиться к событиям", "⚠️ Выделить ключевые дни"],
    howItWorks: ["🃏 Каждая карта соответствует дню недели, чтение идёт последовательно как цепочка событий.", "Показывает где максимум напряжения и где точки роста."],
    forWhom: ["✓ Для планирования", "✓ Перед насыщенной неделей"]
  },
  lenormand_next_month: {
    subtitle: "Прогноз по этапам месяца",
    metaLine: "7 карт · первая и вторая половина месяца",
    header: "Ближайший месяц",
    purpose: ["📅 Увидеть ключевые события месяца", "📈 Подготовиться к изменениям", "🎯 Понять общий вектор периода"],
    howItWorks: ["🃏 Позиции 1–4 описывают первую часть месяца, 5–7 — вторую половину и итог.", "Каждая карта отражает период и его тему."],
    forWhom: ["✓ Для планирования месяца", "✓ Для стратегических решений"]
  },
  lenormand_wheel_of_year: {
    subtitle: "Годовой прогноз по месяцам",
    metaLine: "12 карт · годовой цикл · события по месяцам",
    header: "Колесо года (12 карт)",
    purpose: ["📆 Построить картину года", "📊 Понять динамику месяцев", "🔮 Выделить ключевые периоды"],
    howItWorks: ["🃏 Карты выкладываются по кругу как часы: каждая позиция = отдельный месяц.", "Расклад показывает периоды роста, напряжённые этапы и итог года."],
    forWhom: ["✓ Для планирования года", "✓ Перед важными решениями"]
  },
  lenormand_square_9: {
    subtitle: "Объёмный разбор ситуации",
    metaLine: "9 карт · фон · развитие · итог и последствия",
    header: "9-карточный квадрат (Анализ ситуации)",
    purpose: ["🔎 Разобрать сложную ситуацию", "📌 Увидеть скрытые влияния", "🧠 Отделить фон от ключевого фактора"],
    howItWorks: ["🃏 Центр — суть вопроса, верхний ряд — причины, средний — развитие, нижний — последствия.", "Даёт детальную картину и точки для вмешательства."],
    forWhom: ["✓ При запутанных вопросах", "✓ Когда нужен глубокий анализ"]
  },
  lenormand_grand_tableau: {
    subtitle: "Полный обзор по системе Ленорман",
    metaLine: "36 карт · полный обзор жизни · судьбоносные события",
    header: "Большой расклад Ленорман (Grand Tableau)",
    purpose: ["🔮 Получить комплексный прогноз", "🧭 Увидеть линии судьбы и ключевые фигуры", "📚 Считать взаимосвязи между сферами жизни"],
    howItWorks: ["🃏 4 ряда по 9 карт: анализируются дома, линии, диагонали и сочетания соседних карт.", "Это самый глубокий расклад системы Ленорман."],
    forWhom: ["✓ Для стратегического прогноза", "✓ Для серьёзных жизненных решений"]
  }
};

const MANARA_SPREAD_DETAILS: Record<string, SpreadDetailsContent> = {
  manara_mystery_love: {
    subtitle: "Двойной уровень близости",
    metaLine: "8 карт · сознание · страсть · итог союза",
    header: "Мистерия любви (8 карт)",
    purpose: ["❤️ Разобрать чувства и сексуальную динамику", "🔎 Увидеть скрытые страхи пары", "🧭 Понять, куда движется связь"],
    howItWorks: ["🃏 Верхний ряд показывает осознанный уровень отношений, нижний — глубинные импульсы и страсть.", "Финальные позиции дают вектор развития и итог союза."],
    forWhom: ["✓ Для глубокого анализа пары", "✓ Когда важно понять эмоциональную и интимную совместимость"]
  },
  manara_love_check: {
    subtitle: "Квадрат близости",
    metaLine: "4 карты · чувства · намерения · мотивы · перспектива",
    header: "Проверка любви (4 карты)",
    purpose: ["❤️ Проверить искренность отношений", "🧠 Отличить чувства от расчёта", "🔮 Оценить перспективу союза"],
    howItWorks: ["🃏 Карты читаются как компактный квадрат: чувства, намерения, скрытые мотивы и итоговая перспектива.", "Расклад даёт быстрый и чёткий эмоциональный срез."],
    forWhom: ["✓ Для раннего этапа отношений", "✓ Когда нужна проверка без длинного расклада"]
  },
  manara_two_hearts: {
    subtitle: "Форма сердца",
    metaLine: "8 карт · вы · партнёр · притяжение · препятствие · итог",
    header: "Два сердца (8 карт)",
    purpose: ["💞 Увидеть баланс ожиданий в паре", "🔥 Понять уровень притяжения", "🧭 Считать ближайшее развитие и итог"],
    howItWorks: ["🃏 Верхние карты описывают вас и партнёра, центр — страсть и препятствие, нижние — развитие и финал.", "Форма расклада подсвечивает эмоциональное ядро отношений."],
    forWhom: ["✓ Для анализа серьёзных отношений", "✓ Когда нужно понять совместимость и риски"]
  },
  manara_relationship_future: {
    subtitle: "Треугольник судьбы",
    metaLine: "9 карт · вклад партнёров · фактор · этапы · два итога",
    header: "Отношения на будущее (9 карт)",
    purpose: ["🔮 Оценить будущее пары", "⚖️ Понять вклад каждого", "📌 Выявить внешние и внутренние факторы"],
    howItWorks: ["🃏 Верхняя вершина задаёт основу связи, середина раскрывает динамику, нижние позиции показывают индивидуальные итоги.", "Расклад помогает увидеть общий потенциал и зону напряжения."],
    forWhom: ["✓ Для долгосрочного прогноза отношений", "✓ Когда важно понять перспективу каждого из партнёров"]
  },
  manara_his_intentions: {
    subtitle: "Фокус на центре",
    metaLine: "5 карт · мысли · чувства · истинное намерение · действия · итог",
    header: "Его намерения (5 карт)",
    purpose: ["💬 Понять, серьёзен ли человек", "🔍 Разделить слова и реальные мотивы", "❤️ Увидеть вероятный итог для вас"],
    howItWorks: ["🃏 Центральная карта — истинное намерение; вокруг неё читаются мысли, чувства, действия и итог.", "Расклад даёт прямой ответ о мотивации партнёра."],
    forWhom: ["✓ Когда есть сомнения в искренности", "✓ При противоречивом поведении человека"]
  },
  manara_feelings_actions: {
    subtitle: "Внутреннее vs внешнее",
    metaLine: "5 карт · чувства · желания · конфликт · действия · итог",
    header: "Чувства и действия (5 карт)",
    purpose: ["❤️ Сравнить эмоции и поступки", "🧠 Понять внутренний конфликт человека", "🧭 Считать развитие ситуации"],
    howItWorks: ["🃏 Верхние карты показывают чувства и желания, центр — ключевой конфликт, нижние — действия и результат.", "Расклад выявляет расхождение между внутренним и внешним проявлением."],
    forWhom: ["✓ Когда нужна ясность в отношениях", "✓ Если слова и действия не совпадают"]
  },
  manara_three_cards: {
    subtitle: "Линия импульса",
    metaLine: "3 карты · причина · развитие · итог",
    header: "Три карты Манара",
    purpose: ["⚡ Быстро оценить ситуацию", "🧭 Понять ход развития", "🎯 Получить короткий итог без перегруза"],
    howItWorks: ["🃏 Первая карта — источник ситуации, вторая — её движение, третья — вероятный итог.", "Подходит для ежедневных и точечных вопросов."],
    forWhom: ["✓ Когда нужен быстрый ответ", "✓ Для стартовой диагностики темы"]
  },
  manara_path: {
    subtitle: "Дуга развития",
    metaLine: "7 карт · факторы · перелом · совет · риск · итог",
    header: "Путь (7 карт)",
    purpose: ["🛤️ Проследить траекторию ситуации", "⚖️ Найти точку перелома", "🧭 Получить совет и увидеть риск"],
    howItWorks: ["🃏 Верхний ряд показывает исходные факторы, центр — переломный момент, нижний — варианты исхода.", "Расклад помогает выбрать стратегию в сложном выборе."],
    forWhom: ["✓ Для личных и эмоционально сложных решений", "✓ Когда нужен прогноз по этапам"]
  },
  manara_celtic_cross: {
    subtitle: "Классика + чувственный анализ",
    metaLine: "10 карт · суть · внутренние факторы · влияние · итог",
    header: "Кельтский крест (Манара)",
    purpose: ["🔮 Получить глубокий психологический разбор", "🧠 Выявить скрытые мотивы и страхи", "📈 Оценить вероятный итог ситуации"],
    howItWorks: ["🃏 Центральная зона раскрывает суть и препятствие, нижний блок — влияние, страх и итог.", "Манара усиливает фокус на эмоциональной и сексуальной мотивации."],
    forWhom: ["✓ Для серьёзных отношений и жизненных развилок", "✓ Когда нужен максимально глубокий анализ"]
  }
};

const ANGELS_SPREAD_DETAILS: Record<string, SpreadDetailsContent> = {
  angels_one_card: {
    subtitle: "Послание Небесной поддержки",
    metaLine: "1 карта · поддержка · духовный ориентир",
    header: "Одна карта Ангела",
    purpose: ["✨ Получить поддержку", "🌿 Уловить тон текущего периода", "🕊 Услышать мягкую подсказку"],
    howItWorks: [
      "🃏 Одна карта отражает главное послание Небесной поддержки именно сейчас.",
      "Это не жёсткий прогноз, а направление: где искать ресурс и на что обратить внимание."
    ],
    forWhom: ["✓ Для ежедневного вдохновения", "✓ В моменты сомнений", "✓ Для внутреннего успокоения"]
  },
  angels_advice: {
    subtitle: "Треугольник совета",
    metaLine: "3 карты · ситуация · совет · благословение",
    header: "Ангельский совет (3 карты)",
    purpose: ["🧭 Понять суть ситуации", "✨ Получить мягкое направление действий", "🌤 Считать благоприятный итог при следовании совету"],
    howItWorks: [
      "🃏 Верхняя карта — центральный совет, нижние — контекст и результат.",
      "Расклад поддержки: акцент на ресурсе и созидательном варианте движения."
    ],
    forWhom: ["✓ Когда нужен бережный ориентир", "✓ Для выбора следующего шага"]
  },
  angels_yes_no_soft: {
    subtitle: "Мягкий ответ без категоричности",
    metaLine: "3 карты · направление · мягкий ответ",
    header: "Ответ свыше (Да / Нет — мягкий)",
    purpose: ["⚖️ Взвесить ситуацию без давления", "🧠 Увидеть условия благоприятного исхода", "🌿 Понять, где есть задержка"],
    howItWorks: [
      "🃏 Левая карта — энергия «да», верхняя — главный духовный фактор, правая — энергия «пока нет».",
      "Расклад показывает степень готовности ситуации, а не «жёсткий приговор»."
    ],
    forWhom: ["✓ Для вопросов выбора", "✓ Когда важно сохранить спокойствие и ясность"]
  },
  angels_balance_soul: {
    subtitle: "Крест гармонии",
    metaLine: "5 карт · состояние · блок · восстановление",
    header: "Баланс души (5 карт)",
    purpose: ["🌿 Понять причину внутреннего дисбаланса", "🕯 Выявить духовный ресурс", "🧭 Найти шаг к восстановлению"],
    howItWorks: [
      "🃏 Центр — главная тема души, верх — духовная энергия, низ — путь восстановления.",
      "Боковые позиции показывают эмоциональный фон и фактор, нарушающий гармонию."
    ],
    forWhom: ["✓ В период усталости", "✓ Когда хочется вернуть внутренний баланс"]
  },
  angels_healing_needed: {
    subtitle: "Источник напряжения и способ исцеления",
    metaLine: "4 карты · источник · урок · поддержка",
    header: "Что требует исцеления (4 карты)",
    purpose: ["🔎 Найти корень внутреннего напряжения", "📖 Понять урок ситуации", "🕊 Увидеть формат ангельской помощи"],
    howItWorks: [
      "🃏 Верхний ряд — источник и проявление, нижний — урок и поддержка.",
      "Финальная карта показывает, через что можно мягко восстановить состояние."
    ],
    forWhom: ["✓ При эмоциональной перегрузке", "✓ Когда нужно понять, что исцелять в первую очередь"]
  },
  angels_body_spirit_energy: {
    subtitle: "Двойная ось: тело и дух",
    metaLine: "6 карт · ресурс · баланс · гармония",
    header: "Энергия тела и духа (6 карт)",
    purpose: ["💪 Оценить уровень жизненного ресурса", "🕯 Проверить связь с интуицией", "⚖️ Увидеть общий баланс"],
    howItWorks: [
      "🃏 Верхний ряд отражает состояние тела и эмоций, нижний — духовный слой и интеграцию.",
      "Расклад помогает увидеть, где теряется энергия и как восстановить целостность."
    ],
    forWhom: ["✓ Для мягкой самодиагностики", "✓ Когда нужно вернуть ресурсность"]
  },
  angels_soul_path: {
    subtitle: "Дуга предназначения",
    metaLine: "7 карт · предназначение · урок · итог",
    header: "Путь души (7 карт)",
    purpose: ["🕊 Осознать текущий этап пути", "📚 Понять высший урок", "🌟 Увидеть итоговую траекторию"],
    howItWorks: [
      "🃏 Верхний ряд — опыт и текущие задачи, центр — предназначение, нижний — поддержка/испытание/итог.",
      "Расклад показывает не только события, но и духовный смысл движения."
    ],
    forWhom: ["✓ Для вопросов предназначения", "✓ В переходные периоды жизни"]
  },
  angels_karmic_lesson: {
    subtitle: "Пентаграмма кармического урока",
    metaLine: "5 карт · карма · урок · освобождение",
    header: "Кармический урок (5 карт)",
    purpose: ["🔁 Выявить повторяющийся сценарий", "🧠 Понять кармический урок", "🌿 Найти путь освобождения"],
    howItWorks: [
      "🃏 Верх задаёт кармическую тему, центр раскрывает урок, низ показывает вектор освобождения.",
      "Боковые карты объясняют, откуда пришёл паттерн и как он воспроизводится."
    ],
    forWhom: ["✓ Для глубокой внутренней работы", "✓ Когда ситуации повторяются по кругу"]
  },
  angels_vector: {
    subtitle: "Стрела развития",
    metaLine: "5 карт · направление · поддержка · выбор",
    header: "Вектор развития (5 карт)",
    purpose: ["🎯 Увидеть оптимальный курс", "⚠️ Осознать риск на пути", "🤍 Определить поддерживающий фактор"],
    howItWorks: [
      "🃏 Карты читаются слева направо как последовательная линия решений.",
      "Расклад помогает выбрать направление с наилучшим потенциалом."
    ],
    forWhom: ["✓ Для ситуаций выбора", "✓ Когда нужно стратегическое направление"]
  },
  angels_relationship_support: {
    subtitle: "Поддержка союза свыше",
    metaLine: "4 карты · энергия · защита · перспектива",
    header: "Ангельская поддержка в отношениях (4 карты)",
    purpose: ["💞 Понять энергию союза", "🧭 Увидеть роли партнёров", "🕊 Получить духовную опору для пары"],
    howItWorks: [
      "🃏 Верхняя карта — базовая энергия отношений, боковые — роли каждого, нижняя — небесная поддержка.",
      "Расклад мягко показывает, как укрепить союз."
    ],
    forWhom: ["✓ Для гармонизации отношений", "✓ Когда нужен бережный взгляд на пару"]
  },
  angels_union_harmony: {
    subtitle: "Двойной баланс пары",
    metaLine: "6 карт · вы · партнёр · энергия · перспектива",
    header: "Гармония союза (6 карт)",
    purpose: ["🤝 Сравнить вклад партнёров", "⚖️ Понять, где баланс и где испытание", "🌿 Увидеть, что укрепляет связь"],
    howItWorks: [
      "🃏 Верхний ряд — вы и партнёр, центр — общая энергия и испытание, нижний — укрепляющий фактор и перспектива.",
      "Расклад даёт практичный ориентир для развития союза."
    ],
    forWhom: ["✓ Для осознанной работы над отношениями", "✓ Когда нужен прогноз по паре"]
  },
  angels_higher_connection_meaning: {
    subtitle: "Вертикаль судьбы",
    metaLine: "5 карт · причина встречи · урок · высший итог",
    header: "Высший смысл связи (5 карт)",
    purpose: ["🕊 Понять духовный смысл связи", "📖 Осознать кармический узел", "🌟 Увидеть высший итог отношений"],
    howItWorks: [
      "🃏 Карты читаются по вертикали: от причины встречи к итогу роста.",
      "Каждая позиция раскрывает следующий слой глубины отношений."
    ],
    forWhom: ["✓ Для судьбоносных и значимых связей", "✓ Когда важен не только прогноз, но и смысл"]
  }
};

const getSpreadById = (spreadId: string) =>
  RWS_SPREADS_MAP[spreadId as keyof typeof RWS_SPREADS_MAP] ??
  LENORMAND_SPREADS_MAP[spreadId as keyof typeof LENORMAND_SPREADS_MAP] ??
  MANARA_SPREADS_MAP[spreadId as keyof typeof MANARA_SPREADS_MAP] ??
  ANGELS_SPREADS_MAP[spreadId as keyof typeof ANGELS_SPREADS_MAP];

function extractCardsCount(spread: DeckSpread): number {
  const mapped = getSpreadById(spread.id);
  if (mapped) return mapped.cardsCount;
  const match = spread.description.match(/(\d+)\s*карт(?:а|ы)?/i);
  if (match) return Number(match[1]);
  return 3;
}

function SpreadCard({ spread, deckId, expanded, onToggle, onSelect, canSelect }: SpreadCardProps) {
  const details =
    deckId === "lenormand"
      ? LENORMAND_SPREAD_DETAILS[spread.id]
      : deckId === "manara"
      ? MANARA_SPREAD_DETAILS[spread.id]
      : deckId === "angels"
      ? ANGELS_SPREAD_DETAILS[spread.id]
      : RWS_SPREAD_DETAILS[spread.id];
  const hasDetailedContent = Boolean(details);
  const cardsCount = extractCardsCount(spread);
  const meta = getSpreadMeta(spread.id, cardsCount, deckId);
  const energyText = `⚡ -${meta.energyCost}`;
  const subtitle = hasDetailedContent ? details.subtitle : spread.description;
  const metaLine = hasDetailedContent
    ? details.metaLine
    : `${cardsCount} карт · ${meta.tags.slice(0, 2).join(" · ")}`;
  const title = hasDetailedContent ? details.header : spread.title;

  return (
    <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55)]">
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="truncate text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="truncate text-sm text-[var(--text-secondary)]">{subtitle}</p>
          <p className="truncate text-sm text-[var(--text-secondary)]">{metaLine}</p>
        </div>
        <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
          <span className="inline-flex h-9 min-w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 px-3 text-sm font-semibold text-white/95 shadow-[0_0_18px_rgba(140,90,255,0.22)]">
            {energyText}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1 border-white/10 bg-[var(--bg-card-strong)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={`spread-desc-${spread.id}`}
          >
            Подробнее
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="primary"
            className="h-9 text-xs text-white"
            onClick={onSelect}
            disabled={!canSelect}
          >
            Выбрать
          </Button>
        </div>
      </div>
      <Expander isOpen={expanded} ariaId={`spread-desc-${spread.id}`}>
        {hasDetailedContent ? (
          <div className="mt-4 space-y-4 rounded-[22px] border border-white/10 bg-white/5 p-4 backdrop-blur">
            <SpreadPreviewByLayout spreadId={spread.id} />
            <div>
              <h4 className="text-base font-semibold text-[var(--text-primary)]">{details.header}</h4>
              <p className="text-xs text-[var(--text-secondary)]">{details.subtitle}</p>
            </div>
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>Для чего подходит</p>
              {details.purpose.map((line) => (
                <p key={`${spread.id}-purpose-${line}`}>{line}</p>
              ))}
            </div>
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>Как работает</p>
              {details.howItWorks.map((line) => (
                <p key={`${spread.id}-how-${line}`}>{line}</p>
              ))}
            </div>
            <div className="space-y-2 text-xs text-[var(--text-secondary)]">
              <p>Кому подойдёт</p>
              {details.forWhom.map((line) => (
                <p key={`${spread.id}-who-${line}`}>{line}</p>
              ))}
            </div>
            <Button type="button" className="w-full" onClick={onSelect} disabled={!canSelect}>
              ✨ Сделать расклад
            </Button>
          </div>
        ) : (
          <p>{spread.description}</p>
        )}
      </Expander>
    </Card>
  );
}

function SpreadPreviewOneCard() {
  return (
    <div className="relative flex h-40 w-full items-center justify-center">
      <div className="absolute h-24 w-24 rounded-full bg-[rgba(140,90,255,0.45)] blur-2xl" />
      <div className="breathing-card">
        <CardBack size={86} />
      </div>
    </div>
  );
}

function SpreadPreviewByLayout({ spreadId }: { spreadId: string }) {
  const spread = getSpreadById(spreadId);

  if (!spread) return <SpreadPreviewOneCard />;

  const previewOverrides: Partial<Record<string, Array<{ x: number; y: number }>>> = {
    five_cards: [
      { x: 50, y: 22 },
      { x: 38, y: 48 },
      { x: 62, y: 48 },
      { x: 68, y: 76 },
      { x: 32, y: 76 }
    ],
    relationship_analysis: [
      { x: 50, y: 20 },
      { x: 30, y: 50 },
      { x: 50, y: 50 },
      { x: 70, y: 50 },
      { x: 50, y: 80 }
    ],
    conflict_reason: [
      { x: 50, y: 20 },
      { x: 30, y: 50 },
      { x: 50, y: 50 },
      { x: 70, y: 50 },
      { x: 50, y: 80 }
    ],
    change_job: [
      { x: 50, y: 18 },
      { x: 30, y: 46 },
      { x: 70, y: 46 },
      { x: 30, y: 78 },
      { x: 70, y: 78 }
    ],
    team_work: [
      { x: 50, y: 50 },
      { x: 50, y: 20 },
      { x: 30, y: 50 },
      { x: 70, y: 50 },
      { x: 50, y: 80 }
    ],
    love_triangle: [
      { x: 50, y: 14 },
      { x: 30, y: 34 },
      { x: 70, y: 34 },
      { x: 38, y: 58 },
      { x: 62, y: 58 },
      { x: 50, y: 76 },
      { x: 50, y: 88 }
    ],
    karmic_connection: [
      { x: 50, y: 52 },
      { x: 50, y: 14 },
      { x: 33, y: 33 },
      { x: 67, y: 33 },
      { x: 27, y: 71 },
      { x: 73, y: 71 },
      { x: 50, y: 88 }
    ],
    vocation_profession: [
      { x: 50, y: 52 },
      { x: 50, y: 14 },
      { x: 33, y: 33 },
      { x: 67, y: 33 },
      { x: 27, y: 71 },
      { x: 73, y: 71 },
      { x: 50, y: 88 }
    ],
    inner_resource: [
      { x: 50, y: 52 },
      { x: 50, y: 16 },
      { x: 30, y: 52 },
      { x: 70, y: 52 },
      { x: 50, y: 88 }
    ],
    celtic_cross: [
      { x: 42, y: 50 },
      { x: 42, y: 50 },
      { x: 42, y: 28 },
      { x: 42, y: 72 },
      { x: 60, y: 50 },
      { x: 24, y: 50 },
      { x: 78, y: 83 },
      { x: 78, y: 61 },
      { x: 78, y: 39 },
      { x: 78, y: 17 }
    ],
    lenormand_his_intentions: [
      { x: 16, y: 52 },
      { x: 50, y: 16 },
      { x: 50, y: 52 },
      { x: 84, y: 52 },
      { x: 50, y: 88 }
    ],
    lenormand_feelings_actions: [
      { x: 24, y: 18 },
      { x: 76, y: 18 },
      { x: 50, y: 54 },
      { x: 24, y: 90 },
      { x: 76, y: 90 }
    ],
    manara_his_intentions: [
      { x: 24, y: 50 },
      { x: 50, y: 18 },
      { x: 50, y: 50 },
      { x: 76, y: 50 },
      { x: 50, y: 82 }
    ],
    manara_feelings_actions: [
      { x: 26, y: 20 },
      { x: 74, y: 20 },
      { x: 50, y: 50 },
      { x: 26, y: 80 },
      { x: 74, y: 80 }
    ],
    manara_relationship_future: [
      { x: 50, y: 4 },
      { x: 38, y: 30 },
      { x: 62, y: 30 },
      { x: 24, y: 58 },
      { x: 50, y: 58 },
      { x: 76, y: 58 },
      { x: 50, y: 86 },
      { x: 38, y: 114 },
      { x: 62, y: 114 }
    ],
    manara_celtic_cross: [
      { x: 38, y: 30 },
      { x: 50, y: 4 },
      { x: 62, y: 30 },
      { x: 50, y: 58 },
      { x: 76, y: 58 },
      { x: 24, y: 58 },
      { x: 50, y: 92 },
      { x: 30, y: 130 },
      { x: 50, y: 130 },
      { x: 70, y: 130 }
    ]
  };

  const override = previewOverrides[spread.id];
  const previewPositions = override
    ? spread.positions.map((position, index) => ({
        ...position,
        x: override[index]?.x ?? position.x,
        y: override[index]?.y ?? position.y
      }))
    : spread.positions;

  const minX = Math.min(...previewPositions.map((position) => position.x));
  const maxX = Math.max(...previewPositions.map((position) => position.x));
  const minY = Math.min(...previewPositions.map((position) => position.y));
  const maxY = Math.max(...previewPositions.map((position) => position.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);
  const fitScale = Math.min(1, 74 / spanX, 70 / spanY);

  const cardsCount = spread.cardsCount;
  const customSizeById: Partial<Record<string, number>> = {
    five_cards: 46,
    relationship_analysis: 42,
    conflict_reason: 42,
    change_job: 40,
    team_work: 42,
    love_triangle: 36,
    karmic_connection: 36,
    vocation_profession: 36,
    inner_resource: 36,
    celtic_cross: 36,
    inner_conflict: 40,
    shadow_side: 34,
    hero_path: 34,
    balance_wheel: 32,
    reset_reload: 36,
    soul_purpose: 34,
    lenormand_his_intentions: 40,
    lenormand_feelings_actions: 40,
    lenormand_wheel_of_year: 24,
    lenormand_square_9: 30,
    lenormand_grand_tableau: 14,
    manara_love_check: 54,
    manara_three_cards: 62,
    manara_his_intentions: 40,
    manara_feelings_actions: 40,
    manara_path: 36,
    manara_mystery_love: 34,
    manara_two_hearts: 34,
    manara_relationship_future: 32,
    manara_celtic_cross: 32,
    angels_advice: 56,
    angels_yes_no_soft: 56,
    angels_balance_soul: 46,
    angels_healing_needed: 52,
    angels_body_spirit_energy: 46,
    angels_soul_path: 40,
    angels_karmic_lesson: 44,
    angels_vector: 48,
    angels_relationship_support: 50,
    angels_union_harmony: 44,
    angels_higher_connection_meaning: 44
  };
  const customSize = customSizeById[spread.id] ?? null;
  const cardSize =
    customSize ?? (cardsCount <= 1 ? 86 : cardsCount <= 3 ? 64 : cardsCount <= 5 ? 56 : cardsCount <= 7 ? 48 : cardsCount <= 10 ? 44 : 38);

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-2xl border border-white/5 bg-white/5">
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(140,90,255,0.35)] blur-2xl" />
      {previewPositions.map((position, idx) => {
        const normalizedX = (position.x - centerX) * fitScale + 50;
        const normalizedY = (position.y - centerY) * fitScale + 50;
        const left = Math.min(90, Math.max(10, normalizedX));
        const top = Math.min(90, Math.max(10, normalizedY));
        return (
          <div
            key={`preview-${spread.id}-${position.index}`}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              zIndex: position.z ?? idx + 1
            }}
          >
            <motion.div
              style={{ rotate: position.rotate ?? 0 }}
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: idx * 0.08 }}
            >
              <CardBack size={cardSize} />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
