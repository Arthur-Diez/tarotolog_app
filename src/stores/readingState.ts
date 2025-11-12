import { create } from "zustand";

import { RWS_ALL } from "@/data/rws_deck";
import type { SpreadId } from "@/data/rws_spreads";

interface CardState {
  positionIndex: number;
  name: string;
  reversed: boolean;
  isOpen: boolean;
}

type ReadingStage =
  | "ask"
  | "sending"
  | "fan"
  | "stacking"
  | "shuffling"
  | "dealing"
  | "await_open"
  | "done";

interface ReadingState {
  deckId: "rws";
  spreadId: SpreadId;
  question: string;
  stage: ReadingStage;
  cards: CardState[];
  mustOpenIndex: number;
  warnedOnce: boolean;
  setQuestion: (value: string) => void;
  setStage: (stage: ReadingStage) => void;
  start: (question: string) => void;
  openCard: (index: number) => void;
  reset: () => void;
}

type TimeoutId = ReturnType<typeof setTimeout>;
let timers: TimeoutId[] = [];

function clearTimers() {
  timers.forEach((id) => clearTimeout(id));
  timers = [];
}

export const useReadingState = create<ReadingState>((set, get) => ({
  deckId: "rws",
  spreadId: "one_card",
  question: "",
  stage: "fan",
  cards: [],
  mustOpenIndex: 1,
  warnedOnce: false,
  setQuestion: (value) => set({ question: value }),
  setStage: (nextStage) => set({ stage: nextStage }),
  start: (question) => {
    clearTimers();
    const shuffled = [...RWS_ALL].sort(() => Math.random() - 0.5);
    const card = shuffled[0];
    const reversed = Math.random() < 0.45;

    set({
      question,
      stage: "sending",
      cards: [{ positionIndex: 1, name: card, reversed, isOpen: false }],
      mustOpenIndex: 1,
      warnedOnce: false
    });

    // timeline handled in UI; timers kept only as fallback fail-safe
    timers.push(
      setTimeout(() => set({ stage: "shuffling" }), 5000),
      setTimeout(() => set({ stage: "dealing" }), 9000),
      setTimeout(() => set({ stage: "await_open" }), 11000)
    );
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
  reset: () => {
    clearTimers();
    set({
      question: "",
      stage: "fan",
      cards: [],
      mustOpenIndex: 1,
      warnedOnce: false
    });
  }
}));
