import { create } from "zustand";

import { RWS_ALL } from "@/data/rws_deck";
import type { SpreadId } from "@/data/rws_spreads";

interface CardState {
  positionIndex: number;
  name: string;
  reversed: boolean;
  isOpen: boolean;
}

type ReadingStage = "ask" | "shuffling" | "dealing" | "await_open" | "done";

interface ReadingState {
  deckId: "rws";
  spreadId: SpreadId;
  question: string;
  stage: ReadingStage;
  cards: CardState[];
  mustOpenIndex: number;
  warnedOnce: boolean;
  setQuestion: (value: string) => void;
  start: (question: string) => void;
  openCard: (index: number) => void;
  reset: () => void;
}

export const useReadingState = create<ReadingState>((set, get) => ({
  deckId: "rws",
  spreadId: "one_card",
  question: "",
  stage: "ask",
  cards: [],
  mustOpenIndex: 1,
  warnedOnce: false,
  setQuestion: (value) => set({ question: value }),
  start: (question) => {
    const shuffled = [...RWS_ALL].sort(() => Math.random() - 0.5);
    const card = shuffled[0];
    const reversed = Math.random() < 0.45;

    set({
      question,
      stage: "shuffling",
      cards: [{ positionIndex: 1, name: card, reversed, isOpen: false }],
      mustOpenIndex: 1,
      warnedOnce: false
    });

    setTimeout(() => set({ stage: "dealing" }), 900);
    setTimeout(() => set({ stage: "await_open" }), 1800);
  },
  openCard: (index) => {
    const state = get();
    if (index !== state.mustOpenIndex) {
      if (!state.warnedOnce) {
        alert("Открывайте карты по порядку!");
        set({ warnedOnce: true });
      } else {
        alert("Порядок уже подсказан — откройте правильную карту.");
      }
      return;
    }

    const nextIndex = state.mustOpenIndex + 1;
    set({
      cards: state.cards.map((card) =>
        card.positionIndex === index ? { ...card, isOpen: true } : card
      ),
      mustOpenIndex: nextIndex,
      stage: nextIndex > state.cards.length ? "done" : state.stage
    });
  },
  reset: () =>
    set({
      question: "",
      stage: "ask",
      cards: [],
      mustOpenIndex: 1,
      warnedOnce: false
    })
}));
