-- =========================================================
-- Tarotolog коммерческий patch
-- Date: 2026-04-18
-- Goal:
-- 1) Нормализовать Stars-only offer feed для UI
-- 2) Добавить канонический каталог пакетов
-- 3) Добавить DB-таблицу для referral share templates
-- 4) Добавить удобные аналитические view по офферам и рефералке
-- Safe / idempotent
-- =========================================================

BEGIN;

-- =========================================================
-- 1) UI-METADATA ДЛЯ PAYMENT OFFERS
--    Позволяет красиво управлять paywall без хардкода во фронте
-- =========================================================
ALTER TABLE public.tarotolog_payment_offers
  ADD COLUMN IF NOT EXISTS subtitle              text,
  ADD COLUMN IF NOT EXISTS badge_kind            text,
  ADD COLUMN IF NOT EXISTS value_note            text,
  ADD COLUMN IF NOT EXISTS display_priority      integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_hidden             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_code          text,
  ADD COLUMN IF NOT EXISTS trigger_product_code  text;

CREATE INDEX IF NOT EXISTS idx_tarotolog_payment_offers_feed
  ON public.tarotolog_payment_offers(
    provider,
    purchase_type,
    currency,
    is_hidden,
    is_archived,
    display_priority,
    created_at DESC
  );

-- =========================================================
-- 2) КАНОНИЧЕСКИЙ КАТАЛОГ ПАКЕТОВ
--    Важно: это не snapshot-офферы, а мастер-список pack definitions
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tarotolog_offer_catalog (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL UNIQUE,

  provider              public.payment_provider NOT NULL DEFAULT 'telegram_stars',
  purchase_type         text NOT NULL DEFAULT 'energy',
  currency              text NOT NULL DEFAULT 'XTR',

  title                 text NOT NULL,
  subtitle              text,
  badge_text            text,
  badge_kind            text,
  cta_text              text,
  value_note            text,

  stars_amount          integer NOT NULL CHECK (stars_amount > 0),
  energy_amount         integer NOT NULL DEFAULT 0 CHECK (energy_amount >= 0),
  bonus_energy          integer NOT NULL DEFAULT 0 CHECK (bonus_energy >= 0),

  sort_order            integer NOT NULL DEFAULT 100,
  is_active             boolean NOT NULL DEFAULT true,
  is_featured           boolean NOT NULL DEFAULT false,
  trigger_context       text,

  starts_at             timestamptz,
  ends_at               timestamptz,

  meta                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_tarotolog_offer_catalog_provider
    CHECK (provider = 'telegram_stars'),
  CONSTRAINT chk_tarotolog_offer_catalog_currency
    CHECK (currency = 'XTR')
);

DROP TRIGGER IF EXISTS trg_tarotolog_offer_catalog_updated ON public.tarotolog_offer_catalog;
CREATE TRIGGER trg_tarotolog_offer_catalog_updated
BEFORE UPDATE ON public.tarotolog_offer_catalog
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_tarotolog_offer_catalog_active
  ON public.tarotolog_offer_catalog(is_active, is_featured, sort_order);

CREATE INDEX IF NOT EXISTS idx_tarotolog_offer_catalog_window
  ON public.tarotolog_offer_catalog(starts_at, ends_at);

-- =========================================================
-- 3) REFERRAL SHARE TEMPLATES
--    Хранит локализованные креативы и тексты шаринга
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tarotolog_referral_share_templates (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL UNIQUE,               -- referral_share_1_ru
  lang                  text NOT NULL,                      -- ru / en
  variant               integer NOT NULL CHECK (variant >= 1),

  title                 text NOT NULL,
  body                  text NOT NULL,
  button_text           text NOT NULL,
  image_path            text NOT NULL,                      -- /assets/referral/generated/...

  is_active             boolean NOT NULL DEFAULT true,
  sort_order            integer NOT NULL DEFAULT 100,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  meta                  jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT chk_tarotolog_referral_share_templates_lang
    CHECK (lang IN ('ru', 'en'))
);

DROP TRIGGER IF EXISTS trg_tarotolog_referral_share_templates_updated ON public.tarotolog_referral_share_templates;
CREATE TRIGGER trg_tarotolog_referral_share_templates_updated
BEFORE UPDATE ON public.tarotolog_referral_share_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS ux_tarotolog_referral_share_templates_lang_variant
  ON public.tarotolog_referral_share_templates(lang, variant);

CREATE INDEX IF NOT EXISTS idx_tarotolog_referral_share_templates_active
  ON public.tarotolog_referral_share_templates(is_active, lang, sort_order);

-- =========================================================
-- 4) БАЗОВЫЕ SEED-ШАБЛОНЫ ДЛЯ REFERRAL SHARE
--    Можно править позже прямо в БД
-- =========================================================
INSERT INTO public.tarotolog_referral_share_templates
  (code, lang, variant, title, body, button_text, image_path, sort_order)
VALUES
  (
    'referral_share_1_ru',
    'ru',
    1,
    'Tarotolog AI',
    'Приходи в mini app и забирай бонусную энергию. Исследуй 9 колод, гороскопы и персональные прогнозы.',
    'Получить бонус',
    '/assets/referral/generated/referral-share-1-ru.png',
    10
  ),
  (
    'referral_share_2_ru',
    'ru',
    2,
    'Tarotolog AI',
    'Открой разные колоды и найди свой стиль чтения: классика, Манара, Ленорман, Золотое Таро и другие.',
    'Открыть mini app',
    '/assets/referral/generated/referral-share-2-ru.png',
    20
  ),
  (
    'referral_share_3_ru',
    'ru',
    3,
    'Tarotolog AI',
    'Забери бонусную энергию и попробуй карту дня, личные трактовки и premium-сценарии внутри приложения.',
    'Забрать бонус',
    '/assets/referral/generated/referral-share-3-ru.png',
    30
  ),
  (
    'referral_share_4_ru',
    'ru',
    4,
    'Tarotolog AI',
    'Открой гороскопы, расклады и личные инсайты в одном mini app. Бонус ждёт после входа.',
    'Начать',
    '/assets/referral/generated/referral-share-4-ru.png',
    40
  ),
  (
    'referral_share_1_en',
    'en',
    1,
    'Tarotolog AI',
    'Join the mini app and claim bonus energy. Explore 9 decks, horoscopes, and personal readings.',
    'Claim bonus',
    '/assets/referral/generated/referral-share-1-en.png',
    10
  ),
  (
    'referral_share_2_en',
    'en',
    2,
    'Tarotolog AI',
    'Explore different tarot styles: classic decks, Lenormand, Manara, Golden Tarot, and more.',
    'Open mini app',
    '/assets/referral/generated/referral-share-2-en.png',
    20
  ),
  (
    'referral_share_3_en',
    'en',
    3,
    'Tarotolog AI',
    'Get bonus energy and try your card of the day, personal interpretations, and premium rituals.',
    'Get bonus',
    '/assets/referral/generated/referral-share-3-en.png',
    30
  ),
  (
    'referral_share_4_en',
    'en',
    4,
    'Tarotolog AI',
    'Unlock horoscopes, spreads, and personal insights in one mini app. Your bonus is waiting inside.',
    'Start now',
    '/assets/referral/generated/referral-share-4-en.png',
    40
  )
ON CONFLICT (code) DO UPDATE
SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  button_text = EXCLUDED.button_text,
  image_path = EXCLUDED.image_path,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- =========================================================
-- 5) VIEW: STARS-ONLY FEED ДЛЯ FRONTEND
--    Можно безопасно использовать вместо сырых таблиц в будущем
-- =========================================================
CREATE OR REPLACE VIEW public.tarotolog_active_stars_offer_feed_view AS
SELECT
  o.id,
  o.user_id,
  COALESCE(o.catalog_code, o.offer_code) AS feed_code,
  o.offer_code,
  o.catalog_code,
  o.title,
  o.subtitle,
  o.label,
  o.badge_kind,
  o.value_note,
  o.purchase_type,
  o.provider,
  o.currency,
  o.final_amount,
  o.stars_amount,
  o.energy_amount,
  COALESCE(o.bonus_energy, 0) AS bonus_energy,
  COALESCE(o.final_energy_amount, o.energy_amount + COALESCE(o.bonus_energy, 0)) AS total_energy,
  o.discount_percent,
  o.discount_amount,
  o.is_personal,
  o.valid_from,
  o.valid_until,
  o.source,
  o.trigger_type,
  o.trigger_product_code,
  o.display_priority,
  o.metadata,
  o.created_at
FROM public.tarotolog_payment_offers o
WHERE o.provider = 'telegram_stars'
  AND COALESCE(o.purchase_type, 'energy') = 'energy'
  AND COALESCE(o.currency, 'XTR') = 'XTR'
  AND COALESCE(o.is_hidden, false) = false
  AND COALESCE(o.is_archived, false) = false
  AND (o.valid_from IS NULL OR o.valid_from <= now())
  AND (o.valid_until IS NULL OR o.valid_until >= now());

-- =========================================================
-- 6) VIEW: КАТАЛОГ АКТИВНЫХ STAR-ПАКЕТОВ
-- =========================================================
CREATE OR REPLACE VIEW public.tarotolog_active_offer_catalog_view AS
SELECT
  c.id,
  c.code,
  c.title,
  c.subtitle,
  c.badge_text,
  c.badge_kind,
  c.cta_text,
  c.value_note,
  c.stars_amount,
  c.energy_amount,
  c.bonus_energy,
  (c.energy_amount + COALESCE(c.bonus_energy, 0)) AS total_energy,
  c.is_featured,
  c.sort_order,
  c.trigger_context,
  c.meta
FROM public.tarotolog_offer_catalog c
WHERE c.is_active = true
  AND (c.starts_at IS NULL OR c.starts_at <= now())
  AND (c.ends_at IS NULL OR c.ends_at >= now())
ORDER BY c.is_featured DESC, c.sort_order ASC, c.created_at ASC;

-- =========================================================
-- 7) VIEW: ЭФФЕКТИВНОСТЬ STAR-ОФФЕРОВ
-- =========================================================
CREATE OR REPLACE VIEW public.tarotolog_offer_performance_stars_view AS
SELECT
  COALESCE(o.catalog_code, o.offer_code) AS offer_code,
  MAX(o.title) AS title,
  MAX(o.source) AS source,
  COUNT(DISTINCT u.id) FILTER (WHERE u.resolution_status = 'shown') AS shown_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.resolution_status = 'dismissed') AS dismissed_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.resolution_status = 'purchased') AS purchased_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'paid') AS paid_count,
  COALESCE(SUM(p.amount_total) FILTER (WHERE p.status = 'paid' AND p.currency = 'XTR'), 0) AS revenue_stars,
  COALESCE(SUM(p.energy_amount + COALESCE(p.bonus_energy, 0)) FILTER (WHERE p.status = 'paid'), 0) AS total_energy_sold,
  ROUND(
    CASE
      WHEN COUNT(DISTINCT u.id) FILTER (WHERE u.resolution_status = 'shown') = 0 THEN 0
      ELSE (
        COUNT(DISTINCT u.id) FILTER (WHERE u.resolution_status = 'purchased')::numeric
        / COUNT(DISTINCT u.id) FILTER (WHERE u.resolution_status = 'shown')::numeric
      ) * 100
    END,
    2
  ) AS conversion_percent
FROM public.tarotolog_payment_offers o
LEFT JOIN public.tarotolog_discount_usages u
  ON u.offer_id = o.id
LEFT JOIN public.tarotolog_payments p
  ON p.offer_id = o.id
WHERE o.provider = 'telegram_stars'
GROUP BY COALESCE(o.catalog_code, o.offer_code);

-- =========================================================
-- 8) VIEW: СВОДКА ПО РЕФЕРАЛКЕ НА ПОЛЬЗОВАТЕЛЯ
-- =========================================================
CREATE OR REPLACE VIEW public.tarotolog_referral_summary_view AS
SELECT
  rc.user_id AS inviter_user_id,
  rc.code AS referral_code,
  COUNT(r.id) AS invites_total,
  COUNT(r.id) FILTER (WHERE r.state IN ('linked','activated','rewarded')) AS linked_total,
  COUNT(r.id) FILTER (WHERE r.activated_at IS NOT NULL) AS activated_total,
  COUNT(r.id) FILTER (WHERE r.first_purchase_at IS NOT NULL) AS first_purchase_total,
  COALESCE(SUM(rre.energy_amount) FILTER (WHERE rre.status = 'granted'), 0) AS earned_energy_total,
  COALESCE(SUM(rre.energy_amount) FILTER (
    WHERE rre.status = 'granted'
      AND rre.reward_kind = 'inviter_activation_bonus'
  ), 0) AS earned_activation_energy,
  COALESCE(SUM(rre.energy_amount) FILTER (
    WHERE rre.status = 'granted'
      AND rre.reward_kind = 'inviter_first_purchase_bonus'
  ), 0) AS earned_purchase_energy,
  MAX(r.created_at) AS last_invite_at,
  MAX(r.activated_at) AS last_activation_at,
  MAX(r.first_purchase_at) AS last_first_purchase_at
FROM public.tarotolog_referral_codes rc
LEFT JOIN public.tarotolog_referrals r
  ON r.inviter_user_id = rc.user_id
LEFT JOIN public.tarotolog_referral_reward_events rre
  ON rre.referral_id = r.id
GROUP BY rc.user_id, rc.code;

-- =========================================================
-- 9) VIEW: ОБЩАЯ ВОРОНКА РЕФЕРАЛКИ
-- =========================================================
CREATE OR REPLACE VIEW public.tarotolog_referral_funnel_view AS
SELECT
  COUNT(*) AS invites_total,
  COUNT(*) FILTER (WHERE state IN ('linked','activated','rewarded')) AS linked_total,
  COUNT(*) FILTER (WHERE activated_at IS NOT NULL) AS activated_total,
  COUNT(*) FILTER (WHERE first_purchase_at IS NOT NULL) AS first_purchase_total,
  ROUND(
    CASE WHEN COUNT(*) = 0 THEN 0
    ELSE (COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::numeric / COUNT(*)::numeric) * 100
    END,
    2
  ) AS activation_rate_percent,
  ROUND(
    CASE WHEN COUNT(*) FILTER (WHERE activated_at IS NOT NULL) = 0 THEN 0
    ELSE (
      COUNT(*) FILTER (WHERE first_purchase_at IS NOT NULL)::numeric
      / COUNT(*) FILTER (WHERE activated_at IS NOT NULL)::numeric
    ) * 100
    END,
    2
  ) AS activated_to_purchase_percent
FROM public.tarotolog_referrals;

-- =========================================================
-- 10) VIEW: АКТИВНЫЕ REFERRAL SHARE TEMPLATES
-- =========================================================
CREATE OR REPLACE VIEW public.tarotolog_active_referral_share_templates_view AS
SELECT
  id,
  code,
  lang,
  variant,
  title,
  body,
  button_text,
  image_path,
  sort_order,
  meta
FROM public.tarotolog_referral_share_templates
WHERE is_active = true
ORDER BY lang ASC, sort_order ASC, variant ASC;

-- =========================================================
-- 11) GRANTS
-- =========================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tg_bot') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public.tarotolog_offer_catalog,
      public.tarotolog_referral_share_templates
    TO tg_bot';

    EXECUTE 'GRANT SELECT ON
      public.tarotolog_active_stars_offer_feed_view,
      public.tarotolog_active_offer_catalog_view,
      public.tarotolog_offer_performance_stars_view,
      public.tarotolog_referral_summary_view,
      public.tarotolog_referral_funnel_view,
      public.tarotolog_active_referral_share_templates_view
    TO tg_bot';
  END IF;
END $$;

COMMIT;

-- =========================================================
-- Optional cleanup block (run manually if needed)
-- ---------------------------------------------------------
-- 1) Скрыть legacy non-stars snapshots из UI-выборок:
-- UPDATE public.tarotolog_payment_offers
-- SET is_hidden = true, is_archived = true
-- WHERE provider <> 'telegram_stars'
--   AND COALESCE(is_archived, false) = false;
--
-- 2) Деактивировать discount rules, нацеленные на robokassa:
-- UPDATE public.tarotolog_discount_rules
-- SET is_active = false,
--     archived_at = COALESCE(archived_at, now())
-- WHERE target_provider = 'robokassa'
--   AND is_active = true;
-- =========================================================
