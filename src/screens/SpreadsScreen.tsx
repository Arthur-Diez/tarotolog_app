import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
import CardBack from "@/components/tarot/CardBack";
import type { Deck, DeckSpread } from "@/data/decks";

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

function SpreadCard({ spread, expanded, onToggle, onSelect, canSelect }: SpreadCardProps) {
  return (
    <Card className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{spread.title}</h3>
          <p className="text-xs text-[var(--text-secondary)]">Энергия · фокус · совет</p>
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
        <p>{spread.description}</p>
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
