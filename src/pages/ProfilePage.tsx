import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DEFAULT_WIDGET_KEYS, WIDGET_KEYS, type UpdateProfilePayload, type WidgetKey } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { useSaveProfile } from "@/hooks/useSaveProfile";
import { normalizeWidgets } from "@/stores/profileState";
import { TimezoneSelectorUnified } from "@/components/TimezoneSelectorUnified";
import { detectDeviceTimezone, formatTimezoneLabel } from "@/lib/timezone";

type GenderOption = "male" | "female" | "other" | "";

interface PersonalFormState {
  lang: string;
  fullName: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  birthPlace: string;
  gender: GenderOption;
}

const GENDER_OPTIONS: Array<{ value: GenderOption; label: string }> = [
  { value: "", label: "Не указано" },
  { value: "female", label: "Женский" },
  { value: "male", label: "Мужской" },
  { value: "other", label: "Другое" }
];

const WIDGET_LABELS: Record<WidgetKey, string> = {
  card_of_day: "Карта дня",
  daily_spread: "Ежедневный расклад",
  individual_horoscope: "Индивидуальный гороскоп",
  astro_forecast: "Астропрогноз",
  numerology_forecast: "Нумерологический прогноз"
};

const COUNTRY_OPTIONS = [
  { code: "RU", label: "Россия" },
  { code: "AM", label: "Армения" },
  { code: "KZ", label: "Казахстан" },
  { code: "BY", label: "Беларусь" },
  { code: "UA", label: "Украина" },
  { code: "GE", label: "Грузия" },
  { code: "DE", label: "Германия" },
  { code: "US", label: "США" },
  { code: "GB", label: "Великобритания" },
  { code: "FR", label: "Франция" },
  { code: "ES", label: "Испания" },
  { code: "IT", label: "Италия" },
  { code: "TR", label: "Турция" }
];

const LANGUAGE_OPTIONS = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" }
];

const LS_LANG_SNAPSHOT_KEY = "tarotolog_lang_diag_snapshot";

function trimToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function buildFullTelegramName(firstName?: string | null, lastName?: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function arraysEqual<T>(left: T[], right: T[]): boolean {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((item, index) => item === rightSorted[index]);
}

function normalizeLang(code: string | null): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const base = trimmed.toLowerCase().split(/[-_]/)[0];
  return base || null;
}

function mapSupportedLang(base: string | null): "ru" | "en" {
  if (base === "ru") return "ru";
  if (base === "en") return "en";
  return "en";
}

function normalizeTimeValue(value: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) {
    return null;
  }
  const [, hours, minutes, seconds] = match;
  return seconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
}

function readOptionalString(target: unknown, key: string): string | null {
  if (!target || typeof target !== "object") return null;
  const value = (target as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getTelegramLanguageSnapshot(): {
  languageCode: string | null;
  rawUserLang: string | null;
  initData: string | null;
  platform: string | null;
  version: string | null;
} {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  const userData = tg?.initDataUnsafe?.user;
  const languageCode = typeof userData?.language_code === "string" ? userData.language_code : null;
  const rawLangCandidate = (userData as { language?: unknown } | undefined)?.language;
  const rawUserLang = typeof rawLangCandidate === "string" ? rawLangCandidate : null;
  const initData = typeof tg?.initData === "string" ? tg.initData : null;
  const platform = readOptionalString(tg, "platform");
  const version = readOptionalString(tg, "version");
  return {
    languageCode,
    rawUserLang,
    initData,
    platform,
    version
  };
}

function getNavigatorLanguageSnapshot(): {
  languages0: string | null;
  language: string | null;
} {
  if (typeof navigator === "undefined") {
    return { languages0: null, language: null };
  }
  const languages0 =
    Array.isArray(navigator.languages) && navigator.languages.length > 0
      ? navigator.languages[0]
      : null;
  const language = typeof navigator.language === "string" ? navigator.language : null;
  return { languages0, language };
}

function getUrlLangParam(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.has("lang")) {
    return params.get("lang");
  }
  const startParam = params.get("tgWebAppStartParam");
  if (startParam && startParam.includes("lang=")) {
    const match = startParam.match(/lang=([A-Za-z_-]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function detectCountry({
  telegramCountry,
  ipCountry,
  telegramLang,
  deviceLang
}: {
  telegramCountry?: string | null;
  ipCountry?: string | null;
  telegramLang?: string | null;
  deviceLang?: string | null;
}): string {
  if (telegramCountry) {
    return telegramCountry.toUpperCase();
  }
  if (ipCountry) {
    return ipCountry.toUpperCase();
  }

  const normalizedTelegramLang = normalizeLang(telegramLang ?? null);
  const normalizedDeviceLang = normalizeLang(deviceLang ?? null);
  if (normalizedTelegramLang === "ru" || normalizedDeviceLang === "ru") {
    return "RU";
  }
  return "Unknown";
}

function getCountryLabel(code: string | null): string {
  if (!code) return "Не выбрано";
  const option = COUNTRY_OPTIONS.find((item) => item.code === code.toUpperCase());
  return option ? option.label : code;
}

function getLanguageLabel(code: string | null): string {
  if (!code) return "Не выбрано";
  const option = LANGUAGE_OPTIONS.find((item) => item.code === code.toLowerCase());
  return option ? option.label : code;
}

export default function ProfilePage() {
  const { profile, loading, error, refresh } = useProfile();
  const { saveProfile, saving, error: saveError, clearError } = useSaveProfile();

  const birthProfile = profile?.birth_profile ?? null;
  const user = profile?.user;
  const initialInterfaceLanguage = birthProfile?.interface_language ?? null;
  const initialEffectiveLang = mapSupportedLang(normalizeLang(initialInterfaceLanguage) ?? null);
  const initialTimezoneName: string | null = birthProfile?.current_tz_name ?? user?.current_tz_name ?? null;
  const combinedTimezoneOffset = birthProfile?.current_tz_offset_min ?? user?.current_tz_offset_min;
  const initialTimezoneOffset: number | null =
    typeof combinedTimezoneOffset === "number" ? combinedTimezoneOffset : null;
  const initialTimezoneConfirmed: boolean =
    typeof birthProfile?.current_tz_confirmed === "boolean"
      ? Boolean(birthProfile?.current_tz_confirmed)
      : Boolean(user?.current_tz_confirmed);

  const initialPersonal = useMemo<PersonalFormState>(() => {
    const telegramFullName = buildFullTelegramName(user?.telegram.first_name, user?.telegram.last_name);

    const timeKnown =
      birthProfile?.birth_time_known ??
      (birthProfile?.birth_time_local ? true : false);

    return {
      lang: initialInterfaceLanguage ?? "system",
      fullName: birthProfile?.full_name ?? telegramFullName ?? "",
      birthDate: birthProfile?.birth_date ?? "",
      birthTime: timeKnown ? birthProfile?.birth_time_local ?? "" : "",
      timeUnknown: !timeKnown,
      birthPlace: birthProfile?.birth_place_text ?? "",
      gender: birthProfile?.gender ?? ""
    };
  }, [
    birthProfile?.birth_date,
    birthProfile?.birth_place_text,
    birthProfile?.birth_time_known,
    birthProfile?.birth_time_local,
    birthProfile?.full_name,
    birthProfile?.gender,
    user?.display_name,
    user?.lang,
    user?.telegram.first_name,
    user?.telegram.last_name,
    initialInterfaceLanguage
  ]);

  const initialWidgets = useMemo<WidgetKey[]>(() => {
    if (profile?.preferences?.widgets?.length) {
      return normalizeWidgets(profile.preferences.widgets);
    }
    return [...DEFAULT_WIDGET_KEYS];
  }, [profile?.preferences?.widgets]);



  const [personal, setPersonal] = useState<PersonalFormState>(initialPersonal);
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetKey[]>(initialWidgets);
  const [personalStatus, setPersonalStatus] =
    useState<{ type: "success" | "error"; message: string } | null>(null);
  const [widgetsStatus, setWidgetsStatus] =
    useState<{ type: "success" | "error"; message: string } | null>(null);
  const [timezoneStatus, setTimezoneStatus] =
    useState<{ type: "success" | "error"; message: string } | null>(null);
  const [timezoneModalOpen, setTimezoneModalOpen] = useState(false);
  const [activeSave, setActiveSave] = useState<"personal" | "widgets" | "timezone" | "country" | "language" | null>(null);
  const [ipCountry, setIpCountry] = useState<string | null>(null);
  const initialConfirmedCountry = birthProfile?.detected_country ?? null;
  const [confirmedCountry, setConfirmedCountry] = useState<string | null>(initialConfirmedCountry);
  const [countryConfirmed, setCountryConfirmed] = useState<boolean>(Boolean(initialConfirmedCountry));
  const [countrySelectOpen, setCountrySelectOpen] = useState(false);
  const [confirmedLanguage, setConfirmedLanguage] = useState<string | null>(initialInterfaceLanguage);
  const [languageConfirmed, setLanguageConfirmed] = useState<boolean>(Boolean(initialInterfaceLanguage));
  const [languageSelectOpen, setLanguageSelectOpen] = useState(false);
  const [timezoneName, setTimezoneName] = useState<string | null>(initialTimezoneName);
  const [timezoneOffset, setTimezoneOffset] = useState<number | null>(initialTimezoneOffset ?? null);
  const [timezoneConfirmed, setTimezoneConfirmed] = useState<boolean>(Boolean(initialTimezoneConfirmed));
  const languageSyncRef = useRef(false);
  const [diag, setDiag] = useState<{
    tgLangCodeRaw: string | null;
    tgLangCodeNorm: string | null;
    navLangRaw: string | null;
    navLangNorm: string | null;
    urlLangRaw: string | null;
    urlLangNorm: string | null;
    effectiveLang: "ru" | "en";
  }>({
    tgLangCodeRaw: null,
    tgLangCodeNorm: null,
    navLangRaw: null,
    navLangNorm: null,
    urlLangRaw: null,
    urlLangNorm: null,
    effectiveLang: initialEffectiveLang
  });
  const deviceTimezone = useMemo(() => detectDeviceTimezone(), []);
  const proposedTimezoneName = timezoneName ?? deviceTimezone.name ?? null;
  const proposedTimezoneOffset =
    timezoneName !== null && timezoneOffset !== null
      ? timezoneOffset
      : deviceTimezone.offset ?? null;
  const timezoneLabel = formatTimezoneLabel(timezoneName, timezoneOffset);
  const timezonePending = !timezoneConfirmed;
  const hasDetectedProposal = Boolean(proposedTimezoneName);
  const pendingLabel = hasDetectedProposal
    ? formatTimezoneLabel(proposedTimezoneName, proposedTimezoneOffset)
    : "Часовой пояс не определён";
  const pendingMessage = hasDetectedProposal
    ? `Надеюсь, ваш часовой пояс — ${pendingLabel}?`
    : "Мы не смогли определить ваш часовой пояс автоматически. Выберите подходящий вариант.";
  const deviceLanguageFallback = typeof navigator !== "undefined" ? navigator.language : null;

  useEffect(() => {
    setPersonal(initialPersonal);
  }, [initialPersonal]);

  useEffect(() => {
    setSelectedWidgets(initialWidgets);
  }, [initialWidgets]);

  useEffect(() => {
    setConfirmedCountry(initialConfirmedCountry);
    setCountryConfirmed(Boolean(initialConfirmedCountry));
  }, [initialConfirmedCountry]);

  useEffect(() => {
    setConfirmedLanguage(initialInterfaceLanguage);
    setLanguageConfirmed(Boolean(initialInterfaceLanguage));
  }, [initialInterfaceLanguage]);

  useEffect(() => {
    setTimezoneName(initialTimezoneName);
    setTimezoneOffset(initialTimezoneOffset ?? null);
    setTimezoneConfirmed(Boolean(initialTimezoneConfirmed));
  }, [initialTimezoneName, initialTimezoneOffset, initialTimezoneConfirmed]);

  useEffect(() => {
    if (personalStatus) {
      const timeout = window.setTimeout(() => setPersonalStatus(null), 3000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [personalStatus]);

  useEffect(() => {
    if (widgetsStatus) {
      const timeout = window.setTimeout(() => setWidgetsStatus(null), 3000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [widgetsStatus]);

  useEffect(() => {
    if (timezoneStatus) {
      const timeout = window.setTimeout(() => setTimezoneStatus(null), 3000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [timezoneStatus]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let cancelled = false;
    const startedAt = Date.now();

    const read = () => {
      if (cancelled) return;
      const tgSnap = getTelegramLanguageSnapshot();
      const navSnap = getNavigatorLanguageSnapshot();
      const urlLang = getUrlLangParam();
      const tgNorm = normalizeLang(tgSnap.languageCode);
      const navRaw = navSnap.languages0 ?? navSnap.language;
      const navNorm = normalizeLang(navRaw);
      const urlNorm = normalizeLang(urlLang);
      const userChoice = confirmedLanguage;
      const userNorm = normalizeLang(userChoice);
      const effectiveBase = userNorm ?? tgNorm ?? urlNorm ?? navNorm ?? null;
      const effective = mapSupportedLang(effectiveBase);

      setDiag({
        tgLangCodeRaw: tgSnap.languageCode,
        tgLangCodeNorm: tgNorm,
        navLangRaw: navRaw,
        navLangNorm: navNorm,
        urlLangRaw: urlLang,
        urlLangNorm: urlNorm,
        effectiveLang: effective
      });

      try {
        window.localStorage.setItem(
          LS_LANG_SNAPSHOT_KEY,
          JSON.stringify({
            tgLangCodeRaw: tgSnap.languageCode,
            navLangRaw: navRaw,
            urlLangRaw: urlLang,
            updatedAt: Date.now()
          })
        );
      } catch {
        // ignore storage issues
      }
    };

    read();
    const interval = window.setInterval(() => {
      read();
      if (Date.now() - startedAt > 10000) {
        window.clearInterval(interval);
      }
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [confirmedLanguage]);

  useEffect(() => {
    if (!profile || languageSyncRef.current) {
      return;
    }
    languageSyncRef.current = true;
    const payload: UpdateProfilePayload = {};
    const deviceLangValue = diag.navLangRaw ?? deviceLanguageFallback ?? null;
    if (deviceLangValue !== null) {
      payload.detected_lang_device = deviceLangValue;
    }
    if (diag.tgLangCodeRaw) {
      payload.detected_lang_telegram = diag.tgLangCodeRaw;
    }
    if (Object.keys(payload).length === 0) {
      return;
    }
    void saveProfile(payload).catch(() => {
      // silent fail
    });
  }, [profile, saveProfile, diag.navLangRaw, diag.tgLangCodeRaw, deviceLanguageFallback]);

  useEffect(() => {
    if (ipCountry !== null || typeof window === "undefined") return;
    let cancelled = false;

    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setIpCountry(
            typeof data?.country === "string"
              ? data.country.toUpperCase()
              : null
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIpCountry(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ipCountry]);

  const detectedCountry = detectCountry({
    ipCountry,
    telegramLang: diag.tgLangCodeNorm,
    deviceLang: diag.navLangRaw ?? deviceLanguageFallback
  });

  const suggestedCountry = (detectedCountry !== "Unknown" ? detectedCountry : "RU").toUpperCase();
  const suggestedLanguage = diag.navLangNorm
    ? mapSupportedLang(diag.navLangNorm)
    : diag.effectiveLang;

  useEffect(() => {
    if (saveError && activeSave) {
      const message = saveError || "Не удалось сохранить данные";
      if (activeSave === "personal") {
        setPersonalStatus({ type: "error", message });
      } else if (activeSave === "widgets") {
        setWidgetsStatus({ type: "error", message });
      } else if (activeSave === "timezone") {
        setTimezoneStatus({ type: "error", message });
      }
      clearError();
      setActiveSave(null);
    }
  }, [activeSave, clearError, saveError]);

  const onPersonalFieldChange = <K extends keyof PersonalFormState>(key: K, value: PersonalFormState[K]) => {
    setPersonal((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleWidget = (key: WidgetKey) => {
    setSelectedWidgets((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const handleConfirmCountry = async () => {
    const value = (confirmedCountry ?? suggestedCountry).toUpperCase();
    setActiveSave("country");
    const payload: UpdateProfilePayload = {
      birth_profile: {
        detected_country: value
      }
    };
    const result = await saveProfile(payload);
    if (result) {
      setConfirmedCountry(value);
      setCountryConfirmed(true);
      setCountrySelectOpen(false);
      void refresh();
    }
    setActiveSave(null);
  };

  const handleCountrySelect = async (countryCode: string) => {
    const value = countryCode.toUpperCase();
    setActiveSave("country");
    const payload: UpdateProfilePayload = {
      birth_profile: {
        detected_country: value
      }
    };
    const result = await saveProfile(payload);
    if (result) {
      setConfirmedCountry(value);
      setCountryConfirmed(true);
      setCountrySelectOpen(false);
      void refresh();
    }
    setActiveSave(null);
  };

  const handleConfirmLanguage = async () => {
    const value = confirmedLanguage ?? suggestedLanguage;
    setActiveSave("language");
    const payload: UpdateProfilePayload = {
      lang: value,
      birth_profile: {
        interface_language: value
      }
    };
    const result = await saveProfile(payload);
    if (result) {
      setConfirmedLanguage(value);
      setLanguageConfirmed(true);
      setLanguageSelectOpen(false);
      setPersonal((prev) => ({
        ...prev,
        lang: value
      }));
      void refresh();
    }
    setActiveSave(null);
  };

  const handleLanguageSelect = async (langCode: string) => {
    const normalized = normalizeLang(langCode) ?? "en";
    const value = mapSupportedLang(normalized);
    setActiveSave("language");
    const payload: UpdateProfilePayload = {
      lang: value,
      birth_profile: {
        interface_language: value
      }
    };
    const result = await saveProfile(payload);
    if (result) {
      setConfirmedLanguage(value);
      setLanguageConfirmed(true);
      setLanguageSelectOpen(false);
      setPersonal((prev) => ({
        ...prev,
        lang: value
      }));
      void refresh();
    }
    setActiveSave(null);
  };

  const normalizedBirthTime = normalizeTimeValue(personal.birthTime);
  const fullNameValid = personal.fullName.trim().length <= 80;
  const birthPlaceValid = personal.birthPlace.trim().length <= 80;
  const dateValid = !personal.birthDate || /^\d{4}-\d{2}-\d{2}$/.test(personal.birthDate);
  const timeValid =
    personal.timeUnknown ||
    Boolean(normalizedBirthTime);

  const personalDirty =
    personal.fullName !== initialPersonal.fullName ||
    personal.birthDate !== initialPersonal.birthDate ||
    personal.birthTime !== initialPersonal.birthTime ||
    personal.timeUnknown !== initialPersonal.timeUnknown ||
    personal.birthPlace !== initialPersonal.birthPlace ||
    personal.gender !== initialPersonal.gender;

  const widgetsDirty = !arraysEqual(selectedWidgets, initialWidgets);

  const personalValid =
    fullNameValid && birthPlaceValid && dateValid && timeValid;

  const handlePersonalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!personalDirty || !personalValid) {
      return;
    }

    setActiveSave("personal");
    setPersonalStatus(null);

    const payload: UpdateProfilePayload = {};

    const birthPayload: NonNullable<UpdateProfilePayload["birth_profile"]> = {};

    if (personal.fullName !== initialPersonal.fullName) {
      birthPayload.full_name = trimToNull(personal.fullName);
    }

    if (personal.birthDate !== initialPersonal.birthDate) {
      birthPayload.birth_date = personal.birthDate || null;
    }

    if (
      personal.timeUnknown !== initialPersonal.timeUnknown ||
      personal.birthTime !== initialPersonal.birthTime
    ) {
      birthPayload.birth_time_known = !personal.timeUnknown;
      const timeToPersist = personal.timeUnknown ? null : normalizedBirthTime;
      birthPayload.birth_time_local = timeToPersist;
    }

    if (personal.birthPlace !== initialPersonal.birthPlace) {
      birthPayload.birth_place_text = trimToNull(personal.birthPlace);
    }

    if (personal.gender !== initialPersonal.gender) {
      birthPayload.gender = personal.gender || null;
    }

    const timezoneNameToPersist = timezoneName ?? proposedTimezoneName;
    const timezoneOffsetToPersist =
      typeof timezoneOffset === "number" ? timezoneOffset : proposedTimezoneOffset;
    if (timezoneNameToPersist && typeof timezoneOffsetToPersist === "number") {
      birthPayload.current_tz_name = timezoneNameToPersist;
      birthPayload.current_tz_offset_min = timezoneOffsetToPersist;
      birthPayload.current_tz_confirmed = timezoneConfirmed;
      payload.current_tz_name = timezoneNameToPersist;
      payload.current_tz_offset_min = timezoneOffsetToPersist;
      payload.current_tz_confirmed = timezoneConfirmed;
    }

    const countryToPersist = (confirmedCountry ?? suggestedCountry)?.toUpperCase();
    if (countryToPersist) {
      birthPayload.detected_country = countryToPersist;
    }

    const languageToPersist = confirmedLanguage ?? suggestedLanguage;
    if (languageToPersist) {
      birthPayload.interface_language = languageToPersist;
      payload.lang = languageToPersist;
    }

    if (Object.keys(birthPayload).length > 0) {
      payload.birth_profile = birthPayload;
    }

    if (Object.keys(payload).length === 0) {
      setActiveSave(null);
      return;
    }

    const result = await saveProfile(payload);

    if (result) {
      setPersonalStatus({ type: "success", message: "Личные данные сохранены" });
      void refresh();
      setActiveSave(null);
    }
  };

  const handleWidgetsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!widgetsDirty) {
      return;
    }

    const widgetsPayload = selectedWidgets.length ? selectedWidgets : [...DEFAULT_WIDGET_KEYS];

    setActiveSave("widgets");
    setWidgetsStatus(null);

    const result = await saveProfile({ widgets: widgetsPayload });

    if (result) {
      setWidgetsStatus({ type: "success", message: "Настройки главной сохранены" });
      setActiveSave(null);
    }
  };

  const handleConfirmTimezone = async () => {
    const nameToSave = proposedTimezoneName;
    const offsetToSave = proposedTimezoneOffset;

    if (!nameToSave || typeof offsetToSave !== "number") {
      setTimezoneModalOpen(true);
      return;
    }

    setActiveSave("timezone");
    const payload: UpdateProfilePayload = {
      current_tz_name: nameToSave,
      current_tz_offset_min: offsetToSave,
      current_tz_confirmed: true,
      birth_profile: {
        current_tz_name: nameToSave,
        current_tz_offset_min: offsetToSave,
        current_tz_confirmed: true
      }
    };
    const result = await saveProfile(payload);
    if (result) {
      setTimezoneName(nameToSave);
      setTimezoneOffset(offsetToSave);
      setTimezoneConfirmed(true);
      setTimezoneStatus({ type: "success", message: "Часовой пояс подтверждён" });
      void refresh();
      setActiveSave(null);
    }
  };

  const handleTimezoneSelect = async (name: string, offset: number) => {
    setActiveSave("timezone");
    const payload: UpdateProfilePayload = {
      current_tz_name: name,
      current_tz_offset_min: offset,
      current_tz_confirmed: true,
      birth_profile: {
        current_tz_name: name,
        current_tz_offset_min: offset,
        current_tz_confirmed: true
      }
    };
    const result = await saveProfile(payload);
    if (result) {
      setTimezoneName(name);
      setTimezoneOffset(offset);
      setTimezoneConfirmed(true);
      setTimezoneStatus({ type: "success", message: "Часовой пояс обновлён" });
      setTimezoneModalOpen(false);
      void refresh();
      setActiveSave(null);
    }
  };

  if (loading && !profile) {
    return (
      <div className="space-y-6">
        <Card className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/90 shadow-[0_30px_60px_rgba(0,0,0,0.55)]">
          <CardContent className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
            <div className="h-24 w-full animate-pulse rounded bg-white/5" />
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/90 shadow-[0_30px_60px_rgba(0,0,0,0.55)]">
          <CardContent className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Card className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/90 shadow-[0_30px_60px_rgba(0,0,0,0.55)] p-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        <Button className="mt-4" onClick={() => refresh()}>
          Повторить
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <Card className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/90 shadow-[0_30px_60px_rgba(0,0,0,0.55)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg font-semibold text-[var(--text-primary)]">
            Личные данные
            {saving && activeSave === "personal" ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-pink)]" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handlePersonalSubmit}>
            <div className="space-y-4">
              <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">Ваш часовой пояс</p>
                {timezonePending ? (
                  <>
                    <p className="text-sm text-[var(--text-secondary)]">{pendingMessage}</p>
                    <Input disabled value={pendingLabel} />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleConfirmTimezone}
                        disabled={saving && activeSave === "timezone"}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setTimezoneModalOpen(true)}
                        disabled={saving && activeSave === "timezone"}
                      >
                        Изменить
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Ваш часовой пояс</p>
                      <p className="text-base font-semibold text-[var(--text-primary)]">{timezoneLabel}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTimezoneModalOpen(true)}
                    >
                      Изменить
                    </Button>
                  </div>
                )}
                {timezoneStatus ? (
                  <div
                    className={`rounded-xl px-4 py-2 text-sm ${
                      timezoneStatus.type === "success"
                        ? "bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {timezoneStatus.message}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">Ваша страна</p>
                {countryConfirmed ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Подтверждённая страна</p>
                      <p className="text-base font-semibold text-[var(--text-primary)]">{getCountryLabel(confirmedCountry)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCountrySelectOpen((prev) => !prev)}
                      disabled={saving && activeSave === "country"}
                    >
                      Изменить
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {`Надеюсь, ваша страна — ${getCountryLabel(suggestedCountry)}?`}
                    </p>
                    <Input disabled value={getCountryLabel(suggestedCountry)} />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleConfirmCountry}
                        disabled={saving && activeSave === "country"}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCountrySelectOpen((prev) => !prev)}
                        disabled={saving && activeSave === "country"}
                      >
                        Изменить
                      </Button>
                    </div>
                  </>
                )}
                {countrySelectOpen ? (
                  <select
                    className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]"
                    value={confirmedCountry ?? suggestedCountry}
                    onChange={(event) => {
                      void handleCountrySelect(event.target.value);
                    }}
                  >
                    {COUNTRY_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">Язык интерфейса</p>
                {languageConfirmed ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-secondary)]">Подтверждённый язык</p>
                      <p className="text-base font-semibold text-[var(--text-primary)]">{getLanguageLabel(confirmedLanguage)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setLanguageSelectOpen((prev) => !prev)}
                      disabled={saving && activeSave === "language"}
                    >
                      Изменить
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {`Надеюсь, ваш язык — ${getLanguageLabel(suggestedLanguage)}?`}
                    </p>
                    <Input disabled value={getLanguageLabel(suggestedLanguage)} />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={handleConfirmLanguage}
                        disabled={saving && activeSave === "language"}
                      >
                        Подтвердить
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setLanguageSelectOpen((prev) => !prev)}
                        disabled={saving && activeSave === "language"}
                      >
                        Изменить
                      </Button>
                    </div>
                  </>
                )}
                {languageSelectOpen ? (
                  <select
                    className="mt-3 h-11 w-full rounded-2xl border border-white/10 bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]"
                    value={confirmedLanguage ?? suggestedLanguage}
                    onChange={(event) => {
                      void handleLanguageSelect(event.target.value);
                    }}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-tertiary)]">
                  Данные рождения
                </h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="gender">
                    Пол
                  </label>
                  <select
                    id="gender"
                    value={personal.gender}
                    onChange={(event) =>
                      onPersonalFieldChange("gender", event.target.value as GenderOption)
                    }
                    className="h-11 rounded-2xl border border-white/10 bg-[var(--bg-card)] px-4 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="fullName">
                    Полное имя
                  </label>
                  <Input
                    id="fullName"
                    value={personal.fullName}
                    onChange={(event) => onPersonalFieldChange("fullName", event.target.value)}
                    placeholder="Имя и фамилия"
                    maxLength={80}
                  />
                  {!fullNameValid ? (
                    <p className="text-xs text-destructive">Полное имя не должно превышать 80 символов</p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="birthDate">
                      Дата рождения
                    </label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={personal.birthDate}
                      onChange={(event) => onPersonalFieldChange("birthDate", event.target.value)}
                    />
                    {!dateValid ? (
                      <p className="text-xs text-destructive">Используйте формат YYYY-MM-DD</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="birthTime">
                      Время рождения
                    </label>
                    <Input
                      id="birthTime"
                      type="time"
                      value={personal.timeUnknown ? "" : personal.birthTime}
                      onChange={(event) => onPersonalFieldChange("birthTime", event.target.value)}
                      disabled={personal.timeUnknown}
                    />
                    {!timeValid ? (
                      <p className="text-xs text-destructive">Укажите время в формате HH:MM или отметьте «Неизвестно»</p>
                    ) : null}
                    <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <Checkbox
                        checked={personal.timeUnknown}
                        onChange={() =>
                          setPersonal((prev) => ({
                            ...prev,
                            timeUnknown: !prev.timeUnknown,
                            birthTime: prev.timeUnknown ? prev.birthTime : ""
                          }))
                        }
                      />
                      Время рождения неизвестно
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--text-primary)]" htmlFor="birthPlace">
                    Место рождения
                  </label>
                  <Input
                    id="birthPlace"
                    value={personal.birthPlace}
                    onChange={(event) => onPersonalFieldChange("birthPlace", event.target.value)}
                    placeholder="Город, страна"
                    maxLength={80}
                  />
                  {!birthPlaceValid ? (
                    <p className="text-xs text-destructive">Место рождения не должно превышать 80 символов</p>
                  ) : null}
                  <p className="text-xs text-[var(--text-secondary)]">TODO: подключить автокомплит по геоданным</p>
                </div>
              </div>
            </div>

            {personalStatus ? (
              <div
                className={`rounded-xl px-4 py-2 text-sm ${
                  personalStatus.type === "success"
                    ? "bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {personalStatus.message}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full"
              disabled={!personalDirty || !personalValid || saving}
            >
              {saving && activeSave === "personal" ? "Сохраняем..." : "Сохранить"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-white/10 bg-[var(--bg-card)]/90 shadow-[0_30px_60px_rgba(0,0,0,0.55)]">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg font-semibold text-[var(--text-primary)]">
            Что показывать на главной
            {saving && activeSave === "widgets" ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--accent-pink)]" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleWidgetsSubmit}>
            <div className="space-y-3">
              {WIDGET_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[var(--bg-card-strong)]/70 px-4 py-3"
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]">{WIDGET_LABELS[key]}</span>
                  <Checkbox
                    checked={selectedWidgets.includes(key)}
                    onChange={() => toggleWidget(key)}
                  />
                </label>
              ))}
            </div>

            {widgetsStatus ? (
              <div
                className={`rounded-xl px-4 py-2 text-sm ${
                  widgetsStatus.type === "success"
                    ? "bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {widgetsStatus.message}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={!widgetsDirty || saving}>
              {saving && activeSave === "widgets" ? "Сохраняем..." : "Сохранить"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-[var(--text-secondary)] shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Диагностика</p>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between">
            <span>Язык Telegram (user.language_code)</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {diag.tgLangCodeRaw ?? "нет"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Язык устройства (navigator)</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {diag.navLangRaw ?? "нет"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Итоговый язык интерфейса</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {getLanguageLabel(diag.effectiveLang)}
            </span>
          </div>
        </div>
      </Card>
      <TimezoneSelectorUnified
        open={timezoneModalOpen}
        onClose={() => setTimezoneModalOpen(false)}
        onSelect={handleTimezoneSelect}
        currentTimezoneName={timezoneName ?? proposedTimezoneName}
        currentTimezoneOffset={
          timezoneName !== null && timezoneOffset !== null ? timezoneOffset : proposedTimezoneOffset ?? null
        }
      />
    </div>
  );
}
