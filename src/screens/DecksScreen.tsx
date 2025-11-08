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
        <h1 className="text-2xl font-semibold text-foreground">Расклады</h1>
        <p className="text-sm text-muted-foreground">
          Выберите колоду и исследуйте расклады под ваш запрос.
        </p>
        <div className="pt-1">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по колодам"
            className="h-10 w-full rounded-2xl border border-border/50 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
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
      className="group flex cursor-pointer flex-col rounded-2xl border border-border/50 bg-card/70 p-4 shadow-lg shadow-black/5 transition active:opacity-90"
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
            <h2 className="text-base font-semibold text-foreground">{deck.title}</h2>
            {/* TODO: cover image (CDN) */}
          </div>
          {deck.subtitle ? <p className="text-xs text-muted-foreground">{deck.subtitle}</p> : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 gap-1"
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
