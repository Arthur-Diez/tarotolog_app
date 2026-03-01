import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { resolveDeckTheme } from "./deckTheme";
import { useDeckTransition } from "./deckTransitionStore";
import { applyDeckThemeVariables } from "./useDeckTheme";
import "./DeckTransitionOverlay.css";

export function DeckTransitionOverlay() {
  const transition = useDeckTransition();
  const [isRendered, setIsRendered] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [snapshot, setSnapshot] = useState(transition);

  const theme = useMemo(() => resolveDeckTheme(snapshot.deckId), [snapshot.deckId]);

  useEffect(() => {
    if (!transition.active || !transition.rect) return;
    setSnapshot(transition);
    setIsRendered(true);
    setIsClosing(false);
    setIsExpanding(false);

    if (typeof document !== "undefined") {
      applyDeckThemeVariables(resolveDeckTheme(transition.deckId), document.documentElement);
    }

    const raf = window.requestAnimationFrame(() => {
      setIsExpanding(true);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [transition.active, transition.sequence, transition.rect, transition.deckId]);

  useEffect(() => {
    if (transition.active || !isRendered) return;
    setIsClosing(true);
    setIsExpanding(false);
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      setIsRendered(false);
    }, 260);

    return () => window.clearTimeout(timer);
  }, [transition.active, isRendered]);

  if (!isRendered || !snapshot.rect) return null;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : snapshot.rect.w;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : snapshot.rect.h;
  const scaleX = Math.max(0.01, snapshot.rect.w / Math.max(1, viewportW));
  const scaleY = Math.max(0.01, snapshot.rect.h / Math.max(1, viewportH));

  return (
    <div
      className={`deck-transition-overlay ${isExpanding ? "isExpanding" : ""} ${isClosing ? "isClosing" : ""}`}
      aria-hidden
    >
      <div className="deck-transition-overlay__backdrop" />
      <div
        className="deck-transition-overlay__portal"
        style={
          {
            ["--overlay-tx" as string]: `${snapshot.rect.x}px`,
            ["--overlay-ty" as string]: `${snapshot.rect.y}px`,
            ["--overlay-sx" as string]: String(scaleX),
            ["--overlay-sy" as string]: String(scaleY),
            ["--overlay-accent" as string]: theme.accent,
            ["--overlay-glow" as string]: theme.glow,
            ["--overlay-bg-a" as string]: theme.bgA,
            ["--overlay-bg-b" as string]: theme.bgB
          } as CSSProperties
        }
      >
        {snapshot.title ? <div className="deck-transition-overlay__title">{snapshot.title}</div> : null}
      </div>
    </div>
  );
}
