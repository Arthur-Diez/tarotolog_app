import { getOfferSessionKey } from "@/lib/offerSessionState";

const OFFER_ENGAGEMENT_META_KEY = "tarotolog_offer_engagement_meta_v1";
const OFFER_ENGAGEMENT_SESSION_KEY = "tarotolog_offer_engagement_session_v1";

type OfferScreenName = "home" | "profile" | "energy" | "spreads" | "horoscope" | "other";

interface OfferEngagementMetaState {
  first_seen_at: string;
  session_count: number;
  last_session_key: string;
}

interface OfferEngagementSessionState {
  session_key: string;
  started_at: string;
  screens: OfferScreenName[];
  energy_opened_at: string | null;
  paid_action_attempted: boolean;
  reward_ad_completed: boolean;
}

export interface OfferEngagementSignals {
  session_key: string;
  session_is_first: boolean;
  session_seconds: number;
  session_screen_count: number;
  session_energy_visited: boolean;
  session_paid_action_attempted: boolean;
  session_reward_ad_completed: boolean;
  energy_page_seconds: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function toSafeSeconds(fromIso: string | null | undefined): number {
  if (!fromIso) return 0;
  const value = new Date(fromIso).getTime();
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor((Date.now() - value) / 1000));
}

function createDefaultMeta(sessionKey: string): OfferEngagementMetaState {
  return {
    first_seen_at: nowIso(),
    session_count: 1,
    last_session_key: sessionKey
  };
}

function createDefaultSession(sessionKey: string): OfferEngagementSessionState {
  return {
    session_key: sessionKey,
    started_at: nowIso(),
    screens: [],
    energy_opened_at: null,
    paid_action_attempted: false,
    reward_ad_completed: false
  };
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined" && typeof window.localStorage !== "undefined";
}

function readMetaState(sessionKey: string): OfferEngagementMetaState {
  if (!canUseStorage()) return createDefaultMeta(sessionKey);
  const raw = window.localStorage.getItem(OFFER_ENGAGEMENT_META_KEY);
  let next = createDefaultMeta(sessionKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<OfferEngagementMetaState>;
      if (parsed && typeof parsed === "object") {
        next = {
          first_seen_at:
            typeof parsed.first_seen_at === "string" && parsed.first_seen_at
              ? parsed.first_seen_at
              : next.first_seen_at,
          session_count:
            typeof parsed.session_count === "number" && Number.isFinite(parsed.session_count) && parsed.session_count > 0
              ? Math.floor(parsed.session_count)
              : next.session_count,
          last_session_key:
            typeof parsed.last_session_key === "string" && parsed.last_session_key
              ? parsed.last_session_key
              : next.last_session_key
        };
      }
    } catch {
      next = createDefaultMeta(sessionKey);
    }
  }

  if (next.last_session_key !== sessionKey) {
    next = {
      ...next,
      session_count: Math.max(1, next.session_count + 1),
      last_session_key: sessionKey
    };
  }

  window.localStorage.setItem(OFFER_ENGAGEMENT_META_KEY, JSON.stringify(next));
  return next;
}

function readSessionState(sessionKey: string): OfferEngagementSessionState {
  if (!canUseStorage()) return createDefaultSession(sessionKey);
  const raw = window.sessionStorage.getItem(OFFER_ENGAGEMENT_SESSION_KEY);
  let next = createDefaultSession(sessionKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<OfferEngagementSessionState>;
      if (parsed && typeof parsed === "object" && parsed.session_key === sessionKey) {
        next = {
          session_key: sessionKey,
          started_at:
            typeof parsed.started_at === "string" && parsed.started_at
              ? parsed.started_at
              : next.started_at,
          screens: Array.isArray(parsed.screens)
            ? parsed.screens.filter((item): item is OfferScreenName => typeof item === "string") as OfferScreenName[]
            : [],
          energy_opened_at:
            typeof parsed.energy_opened_at === "string" && parsed.energy_opened_at
              ? parsed.energy_opened_at
              : null,
          paid_action_attempted: Boolean(parsed.paid_action_attempted),
          reward_ad_completed: Boolean(parsed.reward_ad_completed)
        };
      }
    } catch {
      next = createDefaultSession(sessionKey);
    }
  }

  if (next.session_key !== sessionKey) {
    next = createDefaultSession(sessionKey);
  }

  window.sessionStorage.setItem(OFFER_ENGAGEMENT_SESSION_KEY, JSON.stringify(next));
  return next;
}

function writeSessionState(next: OfferEngagementSessionState): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(OFFER_ENGAGEMENT_SESSION_KEY, JSON.stringify(next));
}

function readAllState() {
  const sessionKey = getOfferSessionKey();
  const meta = readMetaState(sessionKey);
  const session = readSessionState(sessionKey);
  return { sessionKey, meta, session };
}

export function markOfferScreenVisit(screen: OfferScreenName): void {
  const { session } = readAllState();
  if (!session.screens.includes(screen)) {
    session.screens = [...session.screens, screen];
  }
  if (screen === "energy" && !session.energy_opened_at) {
    session.energy_opened_at = nowIso();
  }
  writeSessionState(session);
}

export function markPaidActionAttempted(): void {
  const { session } = readAllState();
  session.paid_action_attempted = true;
  writeSessionState(session);
}

export function markRewardAdCompleted(): void {
  const { session } = readAllState();
  session.reward_ad_completed = true;
  writeSessionState(session);
}

export function getOfferEngagementSignals(): OfferEngagementSignals {
  const { sessionKey, meta, session } = readAllState();
  return {
    session_key: sessionKey,
    session_is_first: meta.session_count <= 1,
    session_seconds: toSafeSeconds(session.started_at),
    session_screen_count: session.screens.length,
    session_energy_visited: Boolean(session.energy_opened_at),
    session_paid_action_attempted: session.paid_action_attempted,
    session_reward_ad_completed: session.reward_ad_completed,
    energy_page_seconds: toSafeSeconds(session.energy_opened_at)
  };
}
