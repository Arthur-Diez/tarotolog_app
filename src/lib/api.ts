import type { SpreadId } from "@/data/rws_spreads";

// api.ts
const API_ORIGIN = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://api.freakdev.site")
  .trim()
  .replace(/\/+$/, "");
export const API_BASE = `${API_ORIGIN}/api`;

export const WIDGET_KEYS = [
  "card_of_day",
  "daily_spread",
  "individual_horoscope",
  "astro_forecast",
  "numerology_forecast"
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];
export const DEFAULT_WIDGET_KEYS: WidgetKey[] = ["card_of_day", "astro_forecast"];

export class ApiError extends Error {
  code?: string;
  status?: number;
  payload?: unknown;

  constructor(message: string, options?: { code?: string; status?: number; payload?: unknown }) {
    super(message);
    this.name = "ApiError";
    this.code = options?.code;
    this.status = options?.status;
    this.payload = options?.payload;
  }
}

// ====== ВСПОМОГАТЕЛЬНОЕ ======
function getInitData(): string {
  const initData = window.Telegram?.WebApp?.initData;
  if (!initData) {
    throw new Error("Не удалось получить данные Telegram WebApp. Откройте приложение через Telegram.");
  }
  return initData;
}

function getTelegramId(): number | null {
  // @ts-ignore
  const user = window?.Telegram?.WebApp?.initDataUnsafe?.user;
  return user?.id ?? null;
}

function withTelegramId(url: string): string {
  const telegramId = getTelegramId();
  if (!telegramId) {
    throw new Error("Не найдены данные Telegram пользователя");
  }
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}telegram_id=${encodeURIComponent(String(telegramId))}`;
}

function withAuthHeaders(headers?: HeadersInit, includeJson = false): HeadersInit {
  const base: Record<string, string> = {
    "X-Telegram-Init-Data": getInitData()
  };
  if (includeJson) {
    base["Content-Type"] = "application/json";
  }
  return {
    ...base,
    ...headers
  };
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await parseResponse(res);
  const maybeObject = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;

  if (!res.ok) {
    const detail = maybeObject?.detail;
    const code =
      (typeof maybeObject?.code === "string" && maybeObject.code) ||
      (typeof detail === "object" && detail !== null && typeof (detail as Record<string, unknown>).code === "string"
        ? ((detail as Record<string, unknown>).code as string)
        : undefined);
    const msg =
      typeof data === "string"
        ? data
        : (typeof detail === "string"
            ? detail
            : typeof detail === "object" && detail !== null && typeof (detail as Record<string, unknown>).message === "string"
              ? ((detail as Record<string, unknown>).message as string)
              : (maybeObject?.message as string | undefined)) ?? `API Error: ${res.status}`;

    throw new ApiError(msg, { code, status: res.status, payload: data });
  }

  if (!maybeObject) {
    throw new ApiError("Некорректный ответ сервера", { status: res.status, payload: data });
  }

  return maybeObject as T;
}

// ====== ТИПЫ ПОД РЕАЛЬНЫЙ БЭКЕНД ======

// /api/init_webapp (оставляем как было у тебя)
export interface AuthWebAppPayload {
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  language_code: string | null;
}
export interface AuthWebAppResponse {
  user: {
    display_name: string;
    energy_balance: number;
    lang: string | null;
  };
  settings: {
    notifications: boolean;
    theme: "light" | "dark" | "system";
  };
}

// /api/profile — то, что реально отдаёт бэкенд
export interface BirthProfile {
  full_name: string | null;
  birth_date: string | null;
  birth_time_local: string | null;
  birth_time_known: boolean;
  birth_place_text: string | null;
  birth_lat: number | null;
  birth_lon: number | null;
  birth_tz_name: string | null;
  birth_tz_offset_min: number | null;
  gender: "male" | "female" | "other" | null;
  detected_country?: string | null;
  interface_language?: string | null;
  current_tz_name?: string | null;
  current_tz_offset_min?: number | null;
  current_tz_confirmed?: boolean | null;
  zodiac_sign?: string | null;
}

export interface ProfileResponse {
  user: {
    id?: string | null;
    display_name: string | null;
    energy_balance: number;
    lang: string | null;
    current_tz_name: string | null;
    current_tz_offset_min: number | null;
    current_tz_confirmed?: boolean | null;
    telegram: {
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      is_premium: boolean;
    };
  };
  preferences: {
    widgets: WidgetKey[];
  };
  birth_profile?: BirthProfile | null;
}

// /api/profile/update — то, что реально принимает бэкенд
export interface UpdateProfilePayload {
  display_name?: string | null;
  lang?: string | null;
  widgets?: WidgetKey[]; // массив строк!
  current_tz_name?: string | null;
  current_tz_offset_min?: number | null;
  current_tz_confirmed?: boolean;
  detected_lang_device?: string | null;
  detected_lang_telegram?: string | null;
  birth_profile?: {
    full_name?: string | null;
    birth_date?: string | null;
    birth_time_local?: string | null;
    birth_time_known?: boolean;
    birth_place_text?: string | null;
    birth_lat?: number | null;
    birth_lon?: number | null;
    birth_tz_name?: string | null;
    birth_tz_offset_min?: number | null;
    gender?: "male" | "female" | "other" | null;
    detected_country?: string | null;
    interface_language?: string | null;
    current_tz_name?: string | null;
    current_tz_offset_min?: number | null;
    current_tz_confirmed?: boolean | null;
  };
}

export interface HoroscopeFreeTodayContentSection {
  key?: string | null;
  title?: string | null;
  emoji?: string | null;
  text?: string | null;
}

export interface HoroscopeFreeTodayContentLegacy {
  summary?: string | null;
  sections?: HoroscopeFreeTodayContentSection[] | null;
  best_time?: string | null;
  lucky_color?: string | null;
}

export interface HoroscopeLocalizedJson {
  day_theme?: string | null;
  mood?: string | null;
  love?: { focus?: string | null; advice?: string | null } | null;
  career?: { focus?: string | null; advice?: string | null } | null;
  money?: { focus?: string | null; advice?: string | null } | null;
  health?: { focus?: string | null; advice?: string | null } | null;
  lucky?: { color?: string | null; number?: string | null | number; time_window?: string | null } | null;
  affirmation?: string | null;
  [key: string]: unknown;
}

export interface HoroscopeFreeTodayMeta {
  zodiac_sign?: string | null;
  gender_label?: string | null;
  period_label?: string | null;
  generated_at?: string | null;
  cached?: boolean;
  source?: {
    name?: string | null;
    version?: string | null;
  } | null;
}

export interface HoroscopeFreeTodayContent {
  text_md?: string | null;
  localized_json?: HoroscopeLocalizedJson | HoroscopeFreeTodayContentLegacy | null;
}

export interface HoroscopeFreeTodayResponse {
  success: boolean;
  core_id?: string | null;
  meta?: HoroscopeFreeTodayMeta | null;
  content?: HoroscopeFreeTodayContent | null;
}

export type BackendReadingStatus = "pending" | "queued" | "processing" | "ready" | "error";

export interface ReadingOutputCard {
  position_index: number;
  card_code: string;
  position_label?: string | null;
  meaning?: string | null;
  reversed?: boolean;
  card_name?: string | null;
  image_path?: string | null;
}

export interface ReadingOutputPayload {
  headline?: string | null;
  summary?: string | null;
  core_theme?: string | null;
  dynamics?: string | null;
  risks?: string | null;
  opportunities?: string | null;
  advice?: string | null;
  cards?: ReadingOutputCard[];
  // legacy compatibility
  interpretation?: string | null;
  question?: string | null;
  generated_at?: string | null;
}

export interface CreateReadingCardInput {
  position_index: number;
  card_code: string;
  reversed: boolean;
  position_label?: string;
  card_name?: string;
}

export interface CreateReadingPayload {
  type: "tarot";
  spread_id: SpreadId;
  deck_id: string;
  spread_title?: string;
  deck_title?: string;
  question: string;
  cards: CreateReadingCardInput[];
  locale: string;
}

export interface CreateReadingResponse {
  id: string;
  status: BackendReadingStatus;
}

export interface ReadingResponse {
  id: string;
  status: BackendReadingStatus;
  input_payload: unknown;
  output_payload: ReadingOutputPayload | null;
  summary_text: string | null;
  energy_spent: number;
  balance?: number;
  error: string | null;
}

export interface ViewReadingResponse {
  id: string;
  status: BackendReadingStatus;
  output_payload: ReadingOutputPayload | null;
  summary_text: string | null;
  energy_spent: number;
  balance: number;
}

export interface EnergyBalanceResponse {
  energy_balance: number;
}

export interface SubscriptionStatusResponse {
  has_subscription: boolean;
  plan_code?: string | null;
  ends_at?: string | null;
}

export interface AdsConfigResponse {
  ads_enabled: boolean;
  task_block_id: string;
}

export type AdRewardKind = "daily_x2" | "reward_regular" | "task_regular";

export interface EnergyAdsRewardState {
  available: boolean;
  next_reward_kind: "daily_x2" | "reward_regular" | null;
  next_energy: number;
  available_at: string | null;
  cooldown_seconds_left: number;
  banner_type: "daily_x2" | "reward_regular" | "cooldown" | "unavailable";
  message: string | null;
}

export interface EnergyAdsTaskState {
  available: boolean;
  next_reward_kind: "task_regular" | null;
  next_energy: number;
  available_at: string | null;
  cooldown_seconds_left: number;
  message: string | null;
}

export interface EnergyAdsStateResponse {
  ads_enabled: boolean;
  server_now: string;
  local_date: string;
  local_tz_offset_min: number;
  reward_available_at: string | null;
  task_available_at: string | null;
  banner_type: string | null;
  banner_text: string | null;
  energy_balance: number | null;
  adsgram_block_id: string | null;
  adsgram_task_block_id: string | null;
  reward: EnergyAdsRewardState;
  task: EnergyAdsTaskState;
}

export interface EnergyAdsStartResponse {
  session_id: string;
  reward_kind: AdRewardKind;
  expected_energy: number;
  claimed_energy: number;
  ads_required: number;
  ads_completed: number;
  cooldown_seconds: number;
  session_status: "created" | "waiting_callback" | "rewarded" | "expired" | "cancelled";
  expires_at: string | null;
  local_date: string;
  ad_provider: string | null;
  ad_format: string | null;
  adsgram_block_id: string | null;
}

export interface EnergyAdsCompleteResponse {
  success: boolean;
  session_id: string;
  reward_kind: AdRewardKind;
  energy_credited: number;
  energy_balance: number;
  cooldown_until: string | null;
  reward_available_at: string | null;
  task_available_at: string | null;
  next_reward_kind: "daily_x2" | "reward_regular" | null;
  next_task_kind: "task_regular" | null;
  message: string;
}

export interface DailyRewardStartResponse {
  reward_id: string | null;
  amount: number;
  expires_at: string | null;
  next_available_at: string | null;
}

export interface DailyRewardClaimResponse {
  new_balance: number;
  claimed_at: string;
}

export interface DailyBonusStatusResponse {
  status: string;
  amount: number;
  next_available_at: string | null;
  rewarded_at?: string | null;
  energy_balance?: number | null;
  nextAvailableAt?: string | null;
  rewardedAt?: string | null;
  energyBalance?: number | null;
}

export interface DailyBonusStartResponse {
  reward_session_id: string | null;
  reward_id?: string | null;
  amount: number;
  expires_at: string | null;
  next_available_at: string | null;
  rewardSessionId?: string | null;
  rewardId?: string | null;
  expiresAt?: string | null;
  nextAvailableAt?: string | null;
  adsgram_block_id?: string | null;
  adsgramBlockId?: string | null;
  adsgram?: {
    block_id?: string | null;
    blockId?: string | null;
  } | null;
}

export interface DailyBonusClaimResponse {
  next_available_at?: string | null;
  nextAvailableAt?: string | null;
  energy_balance?: number | null;
  energyBalance?: number | null;
  status?: string | null;
}

export interface RobokassaCreatePaymentResponse {
  purchase_id: string;
  invoice_id: number;
  payment_url: string;
  amount_minor: number;
  currency: string;
  product_code: string;
  product_title: string;
  energy_credited: number;
  status: string;
}

export interface PaymentOfferResponse {
  offer_id: string;
  offer_code: string;
  title: string;
  label: string | null;
  provider: "robokassa" | "telegram_stars";
  purchase_type: string;
  currency: string;
  base_amount: string;
  final_amount: string;
  discount_amount: string | null;
  discount_percent: string | null;
  energy_amount: number;
  bonus_energy: number;
  final_energy_amount: number;
  stars_amount: number | null;
  trigger_type: string;
  priority: number;
  source: string | null;
  valid_until: string | null;
  rule_id: string | null;
  assignment_id: string | null;
}

export interface PaymentOffersResponse {
  provider: "robokassa" | "telegram_stars";
  purchase_type: string;
  currency: string;
  source: string;
  trigger_type: string;
  offers: PaymentOfferResponse[];
}

export interface MarkOfferShownItem {
  offer_id: string;
  usage_id: string | null;
  status: "tracked" | "skipped";
}

export interface MarkOffersShownResponse {
  items: MarkOfferShownItem[];
}

export interface TelegramStarsCreatePaymentResponse {
  payment_id: string;
  purchase_id: string;
  status: string;
  invoice_url: string;
  invoice_link: string;
  payment_url: string;
  invoice_payload: string;
  offer_id: string | null;
  offer_code: string | null;
  offer_title: string | null;
  amount_stars: number;
  currency: string;
  energy_amount: number;
  bonus_energy: number;
  energy_credited: number;
}

export interface TelegramStarsOfferResponse {
  offer_id: string;
  title: string;
  label: string | null;
  offer_code: string;
  amount_stars: number;
  energy_amount: number;
  bonus_energy: number;
  total_energy: number;
  final_amount: string;
  currency: string;
  provider: string;
  source: string | null;
}

export interface TelegramStarsOffersResponse {
  provider: string;
  purchase_type: string;
  currency: string;
  source: string;
  offers: TelegramStarsOfferResponse[];
}

export interface TelegramStarsPaymentStatusResponse {
  payment_id: string;
  status: string;
  fulfillment_status: string;
  purchase_type: string;
  offer_id: string | null;
  offer_code: string | null;
  offer_title: string | null;
  amount_stars: number;
  currency: string;
  energy_amount: number;
  bonus_energy: number;
  energy_credited: number;
  created_at: string | null;
  paid_at: string | null;
  fulfilled_at: string | null;
}

export interface PurchaseStatusResponse {
  purchase_id: string;
  invoice_id: number;
  status: string;
  amount_minor: number;
  currency: string;
  product_code: string;
  product_title: string;
  energy_credited: number;
  created_at: string;
  paid_at: string | null;
}

export interface ReferralProgramResponse {
  referral_code: string;
  referral_link: string;
  share_inline_query: string;
  total_invited: number;
  total_activated: number;
  total_purchased: number;
  total_earned_energy_from_referrals: number;
  preview_text: string;
}

export interface WalletHistoryItemResponse {
  id: string;
  created_at: string;
  delta: number;
  balance_after: number | null;
  reason: string;
  ref_type: string | null;
  ref_id: string | null;
  display_title: string;
  display_subtitle: string | null;
}

export interface WalletHistoryResponse {
  items: WalletHistoryItemResponse[];
  next_cursor: string | null;
}

export interface DiscountRuleResponse {
  id: string;
  code: string;
  title: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  trigger_type: string;
  target_provider: string | null;
  target_purchase_type: string | null;
  target_currency: string | null;
  target_offer_code: string | null;
  discount_type: string;
  discount_value: string;
  bonus_energy: number;
  bonus_percent: string | null;
  starts_at: string | null;
  ends_at: string | null;
  cooldown_hours: number | null;
  global_cooldown_hours: number | null;
  max_shows_per_day: number | null;
  max_uses_total: number | null;
  max_uses_per_user: number | null;
  stackable: boolean;
  stop_processing: boolean;
  audience_filter: Record<string, unknown>;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
  meta: Record<string, unknown>;
}

export interface DiscountAssignmentResponse {
  id: string;
  user_id: string;
  rule_id: string;
  is_active: boolean;
  assigned_at: string | null;
  activated_at: string | null;
  expires_at: string | null;
  usage_count: number;
  show_count: number;
  last_shown_at: string | null;
  last_used_at: string | null;
  meta: Record<string, unknown>;
}

export interface DiscountStatsResponse {
  active_rules: number;
  total_rules: number;
  usages_shown: number;
  usages_purchased: number;
  usages_dismissed: number;
  conversion_rate: number;
}

export interface AdminUserOfferDebugResponse {
  user_id: string;
  state: Record<string, unknown>;
  current_offer: Record<string, unknown> | null;
}

export interface ShareCreateResponse {
  share_token: string;
  expires_at: string;
}

// ====== ВЫЗОВЫ API ======

export async function authWebApp(payload: AuthWebAppPayload): Promise<AuthWebAppResponse> {
  const res = await fetch(`${API_BASE}/webapp/auth`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<AuthWebAppResponse>(res);
}

export async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ProfileResponse>(res);
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  const telegram_id = getTelegramId();
  if (!telegram_id) throw new Error("Не найдены данные Telegram пользователя");

  const bodyPayload: Record<string, unknown> = {
    telegram_id
  };

  if (payload.display_name !== undefined) {
    bodyPayload.display_name = payload.display_name;
  }

  if (payload.lang !== undefined) {
    bodyPayload.lang = payload.lang;
  }

  if (payload.current_tz_name !== undefined) {
    bodyPayload.current_tz_name = payload.current_tz_name;
  }

  if (payload.current_tz_offset_min !== undefined) {
    bodyPayload.current_tz_offset_min = payload.current_tz_offset_min;
  }

  if (payload.current_tz_confirmed !== undefined) {
    bodyPayload.current_tz_confirmed = payload.current_tz_confirmed;
  }

  if (payload.detected_lang_device !== undefined) {
    bodyPayload.detected_lang_device = payload.detected_lang_device;
  }

  if (payload.detected_lang_telegram !== undefined) {
    bodyPayload.detected_lang_telegram = payload.detected_lang_telegram;
  }

  if (payload.widgets !== undefined) {
    bodyPayload.widgets = payload.widgets;
  }

  if (payload.birth_profile) {
    const birthProfilePayload: Record<string, unknown> = {};

    Object.entries(payload.birth_profile).forEach(([key, value]) => {
      if (value !== undefined) {
        birthProfilePayload[key] = value;
      }
    });

    if (Object.keys(birthProfilePayload).length > 0) {
      (bodyPayload as Record<string, unknown>).birth_profile = birthProfilePayload;
    }
  }

  const res = await fetch(`${API_BASE}/profile/update`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(bodyPayload)
  });
  return handleResponse<ProfileResponse>(res);
}

export async function createReading(payload: CreateReadingPayload): Promise<CreateReadingResponse> {
  const res = await fetch(withTelegramId(`${API_BASE}/readings`), {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<CreateReadingResponse>(res);
}

export async function getReading(readingId: string): Promise<ReadingResponse> {
  const res = await fetch(withTelegramId(`${API_BASE}/readings/${readingId}`), {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ReadingResponse>(res);
}

export async function viewReading(readingId: string): Promise<ViewReadingResponse> {
  const res = await fetch(withTelegramId(`${API_BASE}/readings/${readingId}/view`), {
    method: "POST",
    headers: withAuthHeaders()
  });
  return handleResponse<ViewReadingResponse>(res);
}

export async function getEnergy(): Promise<EnergyBalanceResponse> {
  const res = await fetch(`${API_BASE}/profile/energy`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<EnergyBalanceResponse>(res);
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  const res = await fetch(`${API_BASE}/subscription/status`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<SubscriptionStatusResponse>(res);
}

export async function getAdsConfig(): Promise<AdsConfigResponse> {
  const res = await fetch(`${API_BASE}/ads/config`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdsConfigResponse>(res);
}

export async function getEnergyAdsState(): Promise<EnergyAdsStateResponse> {
  const res = await fetch(`${API_BASE}/energy/ads/state`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<EnergyAdsStateResponse>(res);
}

export async function startEnergyRewardAd(mode: "reward" | "task"): Promise<EnergyAdsStartResponse> {
  const endpoint = mode === "task" ? "/energy/ads/task/start" : "/energy/ads/reward/start";
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<EnergyAdsStartResponse>(res);
}

export async function completeEnergyRewardAd(payload: {
  session_id: string;
  provider_session_id?: string;
  callback_token?: string;
  ads_completed_increment?: number;
  provider_payload?: Record<string, unknown>;
}): Promise<EnergyAdsCompleteResponse> {
  const res = await fetch(`${API_BASE}/energy/ads/complete`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<EnergyAdsCompleteResponse>(res);
}

export async function startDailyReward(): Promise<DailyRewardStartResponse> {
  const res = await fetch(`${API_BASE}/rewards/daily/start`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<DailyRewardStartResponse>(res);
}

export async function claimDailyReward(payload: {
  reward_id: string;
}): Promise<DailyRewardClaimResponse> {
  const res = await fetch(`${API_BASE}/rewards/daily/claim`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DailyRewardClaimResponse>(res);
}

export async function getDailyBonusStatus(): Promise<DailyBonusStatusResponse> {
  const res = await fetch(`${API_BASE}/daily-bonus/status`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DailyBonusStatusResponse>(res);
}

export async function startDailyBonus(): Promise<DailyBonusStartResponse> {
  const res = await fetch(`${API_BASE}/daily-bonus/start`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<DailyBonusStartResponse>(res);
}

export async function claimDailyBonus(payload: {
  reward_session_id?: string;
  reward_id?: string;
  ad_event_payload?: Record<string, unknown>;
}): Promise<DailyBonusClaimResponse> {
  const res = await fetch(`${API_BASE}/daily-bonus/claim`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DailyBonusClaimResponse>(res);
}

export async function getFreeHoroscopeToday(): Promise<HoroscopeFreeTodayResponse> {
  const res = await fetch(`${API_BASE}/horoscope/free/today`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<HoroscopeFreeTodayResponse>(res);
}

export async function createRobokassaPayment(payload: {
  product_code?: string;
  offer_id?: string;
  usage_id?: string;
  currency_code?: "RUB" | "USD" | "EUR";
  idempotency_key?: string;
}): Promise<RobokassaCreatePaymentResponse> {
  const res = await fetch(`${API_BASE}/payments/robokassa/create`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<RobokassaCreatePaymentResponse>(res);
}

export async function getPaymentOffers(params: {
  provider: "robokassa" | "telegram_stars";
  currency?: "RUB" | "USD" | "EUR" | "XTR";
  source?: string;
  trigger_type?: string;
}): Promise<PaymentOffersResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("provider", params.provider);
  if (params.currency) searchParams.set("currency", params.currency);
  if (params.source) searchParams.set("source", params.source);
  if (params.trigger_type) searchParams.set("trigger_type", params.trigger_type);

  const res = await fetch(`${API_BASE}/payments/offers?${searchParams.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<PaymentOffersResponse>(res);
}

export async function markPaymentOffersShown(payload: {
  offer_ids: string[];
  source?: string;
  local_date?: string;
  trigger_snapshot?: Record<string, unknown>;
}): Promise<MarkOffersShownResponse> {
  const res = await fetch(`${API_BASE}/payments/offers/mark-shown`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<MarkOffersShownResponse>(res);
}

export async function markPaymentOfferDismissed(usage_id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/payments/offers/mark-dismissed`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({ usage_id })
  });
  await handleResponse<Record<string, unknown>>(res);
}

export async function markPaymentOfferExpired(usage_id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/payments/offers/mark-expired`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({ usage_id })
  });
  await handleResponse<Record<string, unknown>>(res);
}

export async function getTelegramStarsOffers(source = "energy_page"): Promise<TelegramStarsOffersResponse> {
  const searchParams = new URLSearchParams({ source });
  const res = await fetch(`${API_BASE}/payments/telegram-stars/offers?${searchParams.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<TelegramStarsOffersResponse>(res);
}

export async function createTelegramStarsPayment(payload: {
  offer_id?: string;
  product_code?: string;
  usage_id?: string;
  idempotency_key?: string;
}): Promise<TelegramStarsCreatePaymentResponse> {
  const res = await fetch(`${API_BASE}/payments/telegram-stars/create`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<TelegramStarsCreatePaymentResponse>(res);
}

export async function adminListDiscountRules(): Promise<DiscountRuleResponse[]> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountRuleResponse[]>(res);
}

export async function adminCreateDiscountRule(
  payload: Record<string, unknown>
): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminUpdateDiscountRule(
  ruleId: string,
  payload: Record<string, unknown>
): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminToggleDiscountRule(ruleId: string): Promise<DiscountRuleResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}/toggle`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify({})
  });
  return handleResponse<DiscountRuleResponse>(res);
}

export async function adminArchiveDiscountRule(ruleId: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/admin/discounts/rules/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
    headers: withAuthHeaders()
  });
  return handleResponse<{ status: string }>(res);
}

export async function adminAssignDiscountRule(payload: {
  user_id: string;
  rule_id: string;
  expires_at?: string | null;
  meta?: Record<string, unknown>;
}): Promise<DiscountAssignmentResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/assignments`, {
    method: "POST",
    headers: withAuthHeaders(undefined, true),
    body: JSON.stringify(payload)
  });
  return handleResponse<DiscountAssignmentResponse>(res);
}

export async function adminListAssignments(userId?: string): Promise<DiscountAssignmentResponse[]> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/admin/discounts/assignments${suffix}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountAssignmentResponse[]>(res);
}

export async function adminGetDiscountStats(): Promise<DiscountStatsResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/stats`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<DiscountStatsResponse>(res);
}

export async function adminGetUserOfferDebug(userId: string): Promise<AdminUserOfferDebugResponse> {
  const res = await fetch(`${API_BASE}/admin/discounts/debug/user-offer?user_id=${encodeURIComponent(userId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<AdminUserOfferDebugResponse>(res);
}

export async function getTelegramStarsPaymentStatus(paymentId: string): Promise<TelegramStarsPaymentStatusResponse> {
  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<TelegramStarsPaymentStatusResponse>(res);
}

export async function getPurchaseStatus(purchaseId: string): Promise<PurchaseStatusResponse> {
  const res = await fetch(`${API_BASE}/purchases/${encodeURIComponent(purchaseId)}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<PurchaseStatusResponse>(res);
}

export async function getReferralProgram(): Promise<ReferralProgramResponse> {
  const res = await fetch(`${API_BASE}/referrals/program`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<ReferralProgramResponse>(res);
}

export async function getWalletHistory(cursor?: string, limit = 20): Promise<WalletHistoryResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`${API_BASE}/wallet/history?${params.toString()}`, {
    method: "GET",
    headers: withAuthHeaders()
  });
  return handleResponse<WalletHistoryResponse>(res);
}

export async function createShare(payload: { reading_id: string; image: Blob }): Promise<ShareCreateResponse> {
  const formData = new FormData();
  formData.append("reading_id", payload.reading_id);
  formData.append("image", payload.image, "reading.png");

  const res = await fetch(`${API_BASE}/share/create`, {
    method: "POST",
    headers: withAuthHeaders(),
    body: formData
  });
  return handleResponse<ShareCreateResponse>(res);
}
