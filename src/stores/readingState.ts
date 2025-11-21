import { create } from "zustand";

import { RWS_ALL } from "@/data/rws_deck";
import type { SpreadId } from "@/data/rws_spreads";
import type { BackendReadingStatus, ReadingOutputPayload } from "@/lib/api";

interface CardState {
  positionIndex: number;
  name: string;
  reversed: boolean;
  isOpen: boolean;
}

export type ReadingStage =
  | "fan"
  | "collecting"
  | "shuffling"
  | "dealing"
  | "await_open"
  | "done";

export interface ReadingResultState {
  summaryText: string | null;
  outputPayload: ReadingOutputPayload | null;
  energySpent?: number;
  balance?: number;
}

interface ReadingState {
  deckId: "rws";
  spreadId: SpreadId;
  question: string;
  stage: ReadingStage;
  cards: CardState[];
  readingId?: string | null;
  backendStatus?: BackendReadingStatus | null;
  readingResult: ReadingResultState | null;
  setQuestion: (value: string) => void;
  setStage: (stage: ReadingStage) => void;
  start: (question: string) => void;
  openCard: (index: number) => void;
  reset: () => void;
  setBackendMeta: (meta: { readingId?: string | null; backendStatus?: BackendReadingStatus | null }) => void;
  setReadingResult: (result: ReadingResultState | null) => void;
}

export const useReadingState = create<ReadingState>((set, get) => ({
  deckId: "rws",
  spreadId: "one_card",
  question: "",
  stage: "fan",
  cards: [],
  readingId: undefined,
  backendStatus: undefined,
  readingResult: null,
  setQuestion: (value) => set({ question: value }),
  setStage: (nextStage) => set({ stage: nextStage }),
  start: (question) => {
    const shuffled = [...RWS_ALL].sort(() => Math.random() - 0.5);
    const card = shuffled[0];
    const reversed = Math.random() < 0.45;

    set({
      question,
      stage: "fan",
      cards: [{ positionIndex: 1, name: card, reversed, isOpen: false }],
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    });
  },
  openCard: (index) => {
    const state = get();
    if (state.stage !== "await_open") {
      return;
    }

    let wasUpdated = false;
    const updatedCards = state.cards.map((card) => {
      if (card.positionIndex !== index) {
        return card;
      }
      wasUpdated = true;
      return { ...card, isOpen: true };
    });

    if (!wasUpdated) {
      return;
    }

    const allOpen = updatedCards.every((card) => card.isOpen);
    set({ cards: updatedCards, stage: allOpen ? "done" : state.stage });
  },
  reset: () => {
    set({
      question: "",
      stage: "fan",
      cards: [],
      readingId: undefined,
      backendStatus: undefined,
      readingResult: null
    });
  },
  setBackendMeta: (meta) => set(meta),
  setReadingResult: (result) => set({ readingResult: result })
}));
