import { create } from "zustand";

import type { SpreadSchema } from "@/data/spreadSchemas";
import { SpreadOneCard } from "@/data/spreadSchemas";
import { LENORMAND_ALL } from "@/data/lenormand_deck";
import { MANARA_ALL } from "@/data/manara_deck";
import { RWS_ALL } from "@/data/rws_deck";
import type { BackendReadingStatus, ReadingOutputPayload } from "@/lib/api";

export type SpreadStage = "fan" | "collecting" | "shuffling" | "dealing" | "await_open" | "done";

export interface SpreadCardState {
  positionIndex: number;
  name: string;
  reversed: boolean;
  isOpen: boolean;
}

export interface SpreadReadingResult {
  summaryText: string | null;
  outputPayload: ReadingOutputPayload | null;
  energySpent?: number;
  balance?: number;
}

const computeExpectedNext = (schema: SpreadSchema, cards: SpreadCardState[]): number | null => {
  const openedCount = cards.filter((card) => card.isOpen).length;
  return schema.openOrder[openedCount] ?? null;
};

const DECK_CARDS: Record<SpreadSchema["deckType"], string[]> = {
  rws: RWS_ALL,
  lenormand: LENORMAND_ALL,
  manara: MANARA_ALL
};

interface SpreadStoreState {
  schema: SpreadSchema;
  question: string;
  stage: SpreadStage;
  cards: SpreadCardState[];
  hasOrderWarningShown: boolean;
  highlightEnabled: boolean;
  expectedNextCardIndex: number | null;
  readingId?: string | null;
  backendStatus?: BackendReadingStatus | null;
  readingResult: SpreadReadingResult | null;
  setSchema: (schema: SpreadSchema) => void;
  setQuestion: (value: string) => void;
  setStage: (stage: SpreadStage) => void;
  startSpread: (question: string) => void;
  openCard: (positionIndex: number) => void;
  checkOpeningAllowed: (positionIndex: number) => { allowed: boolean; expected: number | null };
  markOrderWarningShown: () => void;
  disableHighlight: () => void;
  reset: () => void;
  setBackendMeta: (meta: { readingId?: string | null; backendStatus?: BackendReadingStatus | null }) => void;
  setReadingResult: (result: SpreadReadingResult | null) => void;
}

export const useSpreadStore = create<SpreadStoreState>((set, get) => ({
  schema: SpreadOneCard,
  question: "",
  stage: "fan",
  cards: [],
  hasOrderWarningShown: false,
  highlightEnabled: true,
  expectedNextCardIndex: SpreadOneCard.openOrder[0] ?? null,
  readingId: undefined,
  backendStatus: undefined,
  readingResult: null,
  setSchema: (schema) =>
    set({
      schema,
      question: "",
      stage: "fan",
      cards: [],
      hasOrderWarningShown: false,
      highlightEnabled: true,
      expectedNextCardIndex: schema.openOrder[0] ?? null,
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    }),
  setQuestion: (value) => set({ question: value }),
  setStage: (stage) => set({ stage }),
  startSpread: (question) => {
    const { schema } = get();
    const sourceCards = DECK_CARDS[schema.deckType] ?? RWS_ALL;
    const shuffled = [...sourceCards].sort(() => Math.random() - 0.5);
    const cards = schema.positions.map((position, index) => ({
      positionIndex: position.id,
      name: shuffled[index % shuffled.length],
      reversed: false,
      isOpen: false
    }));
    set({
      question,
      stage: "fan",
      cards,
      hasOrderWarningShown: false,
      highlightEnabled: true,
      expectedNextCardIndex: schema.openOrder[0] ?? null,
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    });
  },
  openCard: (positionIndex) => {
    const state = get();
    if (state.stage !== "await_open" && state.stage !== "done") {
      return;
    }
    const updatedCards = state.cards.map((card) =>
      card.positionIndex === positionIndex ? { ...card, isOpen: true } : card
    );
    const allOpen = updatedCards.every((card) => card.isOpen);
    set({
      cards: updatedCards,
      stage: allOpen ? "done" : state.stage,
      expectedNextCardIndex: computeExpectedNext(state.schema, updatedCards)
    });
  },
  checkOpeningAllowed: (positionIndex) => {
    const state = get();
    if (state.schema.openingRules !== "in-order" || state.hasOrderWarningShown) {
      return { allowed: true, expected: state.expectedNextCardIndex };
    }
    const expected = state.expectedNextCardIndex;
    if (!expected) {
      return { allowed: true, expected: null };
    }
    return { allowed: expected === positionIndex, expected };
  },
  markOrderWarningShown: () => set({ hasOrderWarningShown: true }),
  disableHighlight: () => set({ highlightEnabled: false }),
  reset: () => {
    const currentSchema = get().schema;
    set({
      question: "",
      stage: "fan",
      cards: [],
      hasOrderWarningShown: false,
      highlightEnabled: true,
      expectedNextCardIndex: currentSchema.openOrder[0] ?? null,
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    });
  },
  setBackendMeta: (meta) => set(meta),
  setReadingResult: (result) => set({ readingResult: result })
}));
