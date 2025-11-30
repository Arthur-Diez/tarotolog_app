import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Expander } from "@/components/Expander";
import { DECKS, type Deck, type DeckId } from "@/data/decks";

interface DecksScreenProps {
  onSelectDeck: (deckId: DeckId) => void;
}

export function DecksScreen({ onSelectDeck }: DecksScreenProps) {
  const [expandedDeck, setExpandedDeck] = useState<DeckId | null>(null);
  const [query, setQuery] = useState("");

  const filteredDecks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return DECKS;
    }

    return DECKS.filter((deck) => {
      const haystack = `${deck.title} ${deck.subtitle ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [query]);

  const toggleDeck = (deckId: DeckId) => {
    setExpandedDeck((prev) => (prev === deckId ? null : deckId));
    navigator.vibrate?.(10);
  };

  const handleSelectDeck = (deckId: DeckId) => {
    onSelectDeck(deckId);
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Расклады</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Выберите колоду и исследуйте расклады под ваш запрос.
        </p>
        <div className="pt-1">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по колодам"
            className="h-11 w-full rounded-2xl border border-white/10 bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]"
          />
          {/* TODO: sorting dropdown (популярные, последние) */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filteredDecks.map((deck) => (
          <DeckCard
            key={deck.id}
            deck={deck}
            expanded={expandedDeck === deck.id}
            onToggle={() => toggleDeck(deck.id)}
            onSelect={() => handleSelectDeck(deck.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface DeckCardProps {
  deck: Deck;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

function DeckCard({ deck, expanded, onToggle, onSelect }: DeckCardProps) {
  return (
    <Card
      className="group flex cursor-pointer flex-col rounded-[24px] border border-white/10 bg-[var(--bg-card)]/85 p-4 shadow-[0_25px_50px_rgba(0,0,0,0.55)] transition active:opacity-90"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{deck.title}</h2>
            {/* TODO: cover image (CDN) */}
          </div>
          {deck.subtitle ? <p className="text-xs text-[var(--text-secondary)]">{deck.subtitle}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-1 border-white/10 bg-[var(--bg-card-strong)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-card-strong)]"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          aria-expanded={expanded}
          aria-controls={`deck-desc-${deck.id}`}
        >
          Подробнее
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown className="h-4 w-4" />
          </motion.span>
        </Button>
      </div>

      <Expander isOpen={expanded} ariaId={`deck-desc-${deck.id}`}>
        <p>{deck.description}</p>
      </Expander>
    </Card>
  );
}
