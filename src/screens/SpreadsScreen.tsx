import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
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
        spreadId === "five_cards")
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
            className="text-sm font-semibold text-secondary transition hover:text-secondary/80"
          >
            ← Назад
          </button>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{deck.title}</h2>
          {deck.subtitle ? (
            <p className="text-xs text-muted-foreground">{deck.subtitle}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {deck.spreads.map((spread) => (
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
                spread.id === "five_cards")
            }
          />
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
    <Card className="rounded-2xl border border-border/40 bg-card/70 p-4 shadow-lg shadow-black/5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{spread.title}</h3>
          <p className="text-xs text-muted-foreground">7 карт • 15 мин</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={`spread-desc-${spread.id}`}
          >
            Подробнее
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.25 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </Button>
          <Button type="button" size="sm" onClick={onSelect} disabled={!canSelect}>
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
