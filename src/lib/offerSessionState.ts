const OFFER_SESSION_STORAGE_KEY = "tarotolog_offer_session_state_v1";

type OfferSessionBucket = Record<string, string>;

interface OfferSessionState {
  session_key: string;
  shown: OfferSessionBucket;
  dismissed: OfferSessionBucket;
}

function createEmptyState(): OfferSessionState {
  return {
    session_key:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `session_${Date.now()}`,
    shown: {},
    dismissed: {}
  };
}

function readState(): OfferSessionState {
  if (typeof window === "undefined") return createEmptyState();
  const raw = window.sessionStorage.getItem(OFFER_SESSION_STORAGE_KEY);
  if (!raw) {
    const initial = createEmptyState();
    window.sessionStorage.setItem(OFFER_SESSION_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<OfferSessionState>;
    if (!parsed || typeof parsed !== "object") throw new Error("invalid");
    const next: OfferSessionState = {
      session_key: typeof parsed.session_key === "string" && parsed.session_key ? parsed.session_key : createEmptyState().session_key,
      shown: parsed.shown && typeof parsed.shown === "object" ? parsed.shown as OfferSessionBucket : {},
      dismissed: parsed.dismissed && typeof parsed.dismissed === "object" ? parsed.dismissed as OfferSessionBucket : {}
    };
    window.sessionStorage.setItem(OFFER_SESSION_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    const fallback = createEmptyState();
    window.sessionStorage.setItem(OFFER_SESSION_STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
  }
}

function writeState(next: OfferSessionState): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(OFFER_SESSION_STORAGE_KEY, JSON.stringify(next));
}

function buildSurfaceKey(triggerType: string, surface: string, offerId?: string | null): string {
  return `${triggerType}:${surface}:${offerId || "*"}`;
}

export function getOfferSessionKey(): string {
  return readState().session_key;
}

export function hasOfferBeenShownInSession(triggerType: string, surface: string, offerId?: string | null): boolean {
  const state = readState();
  const key = buildSurfaceKey(triggerType, surface, offerId);
  return Boolean(state.shown[key]);
}

export function markOfferShownInSession(triggerType: string, surface: string, offerId?: string | null): void {
  const state = readState();
  const key = buildSurfaceKey(triggerType, surface, offerId);
  state.shown[key] = new Date().toISOString();
  writeState(state);
}

export function hasOfferBeenDismissedInSession(triggerType: string, surface: string, offerId?: string | null): boolean {
  const state = readState();
  const key = buildSurfaceKey(triggerType, surface, offerId);
  return Boolean(state.dismissed[key]);
}

export function markOfferDismissedInSession(triggerType: string, surface: string, offerId?: string | null): void {
  const state = readState();
  const key = buildSurfaceKey(triggerType, surface, offerId);
  state.dismissed[key] = new Date().toISOString();
  writeState(state);
}
