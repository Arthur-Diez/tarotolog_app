import { useSyncExternalStore } from "react";

export interface DeckTransitionRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DeckTransitionState {
  active: boolean;
  deckId: string | null;
  title?: string;
  rect: DeckTransitionRect | null;
  sequence: number;
}

const listeners = new Set<() => void>();

let state: DeckTransitionState = {
  active: false,
  deckId: null,
  title: undefined,
  rect: null,
  sequence: 0
};

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function startTransition(payload: { deckId: string; rect: DeckTransitionRect; title?: string }) {
  state = {
    active: true,
    deckId: payload.deckId,
    title: payload.title,
    rect: payload.rect,
    sequence: state.sequence + 1
  };
  emit();
}

export function endTransition() {
  if (!state.active) return;
  state = {
    ...state,
    active: false
  };
  emit();
}

export function useDeckTransition() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
