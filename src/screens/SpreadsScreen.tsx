import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
import CardBack from "@/components/tarot/CardBack";
import type { Deck, DeckSpread } from "@/data/decks";
import { RWS_SPREADS_MAP } from "@/data/rws_spreads";

interface SpreadsScreenProps {
  deck: Deck;
  onBack: () => void;
}

export function SpreadsScreen({ deck, onBack }: SpreadsScreenProps) {
  const [expandedSpread, setExpandedSpread] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleSpread = (spreadId: string) => {
    setExpandedSpread((prev) => (prev === spreadId ? null : spreadId));
    navigator.vibrate?.(10);
  };

  const handleSelectSpread = (spreadId: string) => {
    if (
      deck.id === "rws" &&
      (spreadId === "one_card" ||
        spreadId === "yes_no" ||
        spreadId === "three_cards" ||
        spreadId === "cross" ||
        spreadId === "five_cards" ||
        spreadId === "horseshoe" ||
        spreadId === "star" ||
        spreadId === "pyramid" ||
        spreadId === "celtic_cross" ||
        spreadId === "wheel_of_year")
    ) {
      navigate(`/spreads/play/${spreadId}`);
      return;
    }

    alert("Этот расклад будет доступен позже");
  };

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

      <div className="space-y-3">
        {deck.spreads.map((spread) => (
          spread.id === "one_card" ? (
            <SpreadCardOneCard
              key={spread.id}
              spread={spread}
              expanded={expandedSpread === spread.id}
              onToggle={() => toggleSpread(spread.id)}
              onSelect={() => handleSelectSpread(spread.id)}
              canSelect={
                deck.id === "rws" &&
                (spread.id === "one_card" ||
                  spread.id === "yes_no" ||
                  spread.id === "three_cards" ||
                  spread.id === "cross" ||
                  spread.id === "five_cards" ||
                  spread.id === "horseshoe" ||
                  spread.id === "star" ||
                  spread.id === "pyramid" ||
                  spread.id === "celtic_cross" ||
                  spread.id === "wheel_of_year")
              }
            />
          ) : (
            <SpreadCard
              key={spread.id}
              spread={spread}
              expanded={expandedSpread === spread.id}
              onToggle={() => toggleSpread(spread.id)}
              onSelect={() => handleSelectSpread(spread.id)}
              canSelect={
                deck.id === "rws" &&
                (spread.id === "one_card" ||
                  spread.id === "yes_no" ||
                  spread.id === "three_cards" ||
                  spread.id === "cross" ||
                  spread.id === "five_cards" ||
                  spread.id === "horseshoe" ||
                  spread.id === "star" ||
                  spread.id === "pyramid" ||
                  spread.id === "celtic_cross" ||
                  spread.id === "wheel_of_year")
              }
            />
          )
        ))}
      </div>
    </div>
  );
}

interface SpreadCardProps {
  spread: DeckSpread;
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
  }
};

function SpreadCard({ spread, expanded, onToggle, onSelect, canSelect }: SpreadCardProps) {
  const details = RWS_SPREAD_DETAILS[spread.id];
  const isRwsDetailed = Boolean(details);

  return (
    <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{isRwsDetailed ? details.header : spread.title}</h3>
          <p className="text-xs text-[var(--text-secondary)]">{isRwsDetailed ? details.subtitle : "Энергия · фокус · совет"}</p>
          {isRwsDetailed && <p className="text-xs text-[var(--text-secondary)]">{details.metaLine}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 border-white/10 bg-[var(--bg-card-strong)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]"
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
            className="text-xs text-white"
            onClick={onSelect}
            disabled={!canSelect}
          >
            Выбрать
          </Button>
        </div>
      </div>
      <Expander isOpen={expanded} ariaId={`spread-desc-${spread.id}`}>
        {isRwsDetailed ? (
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
  const spread = RWS_SPREADS_MAP[spreadId as keyof typeof RWS_SPREADS_MAP];

  if (!spread) return <SpreadPreviewOneCard />;

  const previewPositions =
    spread.id === "five_cards"
      ? [
          { ...spread.positions[0], x: 50, y: 25 },
          { ...spread.positions[1], x: 38, y: 47 },
          { ...spread.positions[2], x: 62, y: 47 },
          { ...spread.positions[3], x: 68, y: 69 },
          { ...spread.positions[4], x: 32, y: 69 }
        ]
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
  const customSize = spread.id === "five_cards" ? 48 : null;
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

function SpreadCardOneCard({ spread, expanded, onToggle, onSelect, canSelect }: SpreadCardProps) {
  return (
    <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Одна карта</h3>
          <p className="text-xs text-[var(--text-secondary)]">Карта дня</p>
          <p className="text-xs text-[var(--text-secondary)]">1 карта · Энергия · фокус · совет</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 border-white/10 bg-[var(--bg-card-strong)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]"
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
            className="text-xs text-white"
            onClick={onSelect}
            disabled={!canSelect}
          >
            Выбрать
          </Button>
        </div>
      </div>
      <Expander isOpen={expanded} ariaId={`spread-desc-${spread.id}`}>
        <div className="mt-4 space-y-4 rounded-[22px] border border-white/10 bg-white/5 p-4 backdrop-blur">
          <SpreadPreviewOneCard />
          <div>
            <h4 className="text-base font-semibold text-[var(--text-primary)]">Одна карта</h4>
            <p className="text-xs text-[var(--text-secondary)]">Послание дня и энергия момента</p>
          </div>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <p>Для чего подходит</p>
            <p>🔮 Понять энергию дня</p>
            <p>⚡ Получить совет или предупреждение</p>
            <p>🌙 Увидеть шанс или урок</p>
          </div>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <p>Как работает</p>
            <p>🃏 1 карта = 1 ключевое послание</p>
            <p>Фокус на теме дня и внимании</p>
          </div>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <p>Кому подойдёт</p>
            <p>✓ Новичкам</p>
            <p>✓ Когда нужен быстрый ответ</p>
          </div>
          <Button type="button" className="w-full" onClick={onSelect} disabled={!canSelect}>
            ✨ Сделать расклад
          </Button>
        </div>
      </Expander>
    </Card>
  );
}
