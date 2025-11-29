import { create } from "zustand";

import type { SpreadSchema } from "@/data/spreadSchemas";
import { SpreadOneCard } from "@/data/spreadSchemas";
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

interface SpreadStoreState {
  schema: SpreadSchema;
  question: string;
  stage: SpreadStage;
  cards: SpreadCardState[];
  forcedFreeOpening: boolean;
  readingId?: string | null;
  backendStatus?: BackendReadingStatus | null;
  readingResult: SpreadReadingResult | null;
  setSchema: (schema: SpreadSchema) => void;
  setQuestion: (value: string) => void;
  setStage: (stage: SpreadStage) => void;
  startSpread: (question: string) => void;
  openCard: (positionIndex: number) => { blocked: boolean };
  allowFreeOpening: () => void;
  reset: () => void;
  setBackendMeta: (meta: { readingId?: string | null; backendStatus?: BackendReadingStatus | null }) => void;
  setReadingResult: (result: SpreadReadingResult | null) => void;
}

export const useSpreadStore = create<SpreadStoreState>((set, get) => ({
  schema: SpreadOneCard,
  question: "",
  stage: "fan",
  cards: [],
  forcedFreeOpening: false,
  readingId: undefined,
  backendStatus: undefined,
  readingResult: null,
  setSchema: (schema) =>
    set({
      schema,
      question: "",
      stage: "fan",
      cards: [],
      forcedFreeOpening: false,
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    }),
  setQuestion: (value) => set({ question: value }),
  setStage: (stage) => set({ stage }),
  startSpread: (question) => {
    const { schema } = get();
    const shuffled = [...RWS_ALL].sort(() => Math.random() - 0.5);
    const cards = schema.positions.map((position, index) => ({
      positionIndex: position.id,
      name: shuffled[index],
      reversed: Math.random() < 0.45,
      isOpen: false
    }));
    set({
      question,
      stage: "fan",
      cards,
      forcedFreeOpening: false,
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    });
  },
  openCard: (positionIndex) => {
    const state = get();
    if (state.stage !== "await_open" && state.stage !== "done") {
      return { blocked: false };
    }
    if (!state.forcedFreeOpening && state.schema.openingRules === "in-order") {
      const firstClosed = state.cards.find((card) => !card.isOpen);
      if (firstClosed && firstClosed.positionIndex !== positionIndex) {
        return { blocked: true };
      }
    }
    const updatedCards = state.cards.map((card) =>
      card.positionIndex === positionIndex ? { ...card, isOpen: true } : card
    );
    const allOpen = updatedCards.every((card) => card.isOpen);
    set({ cards: updatedCards, stage: allOpen ? "done" : state.stage });
    return { blocked: false };
  },
  allowFreeOpening: () => set({ forcedFreeOpening: true }),
  reset: () =>
    set({
      question: "",
      stage: "fan",
      cards: [],
      forcedFreeOpening: false,
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    }),
  setBackendMeta: (meta) => set(meta),
  setReadingResult: (result) => set({ readingResult: result })
}));
