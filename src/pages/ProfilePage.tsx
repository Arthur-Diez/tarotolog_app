import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DEFAULT_WIDGET_KEYS, WIDGET_KEYS, type UpdateProfilePayload, type WidgetKey } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { useSaveProfile } from "@/hooks/useSaveProfile";
import { normalizeWidgets } from "@/stores/profileState";

type GenderOption = "male" | "female" | "other" | "";

interface PersonalFormState {
  displayName: string;
  lang: string;
  fullName: string;
  birthDate: string;
  birthTime: string;
  timeUnknown: boolean;
  birthPlace: string;
  gender: GenderOption;
}

const LANG_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "system", label: "Системный" }
];

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

export default function ProfilePage() {
  const { profile, loading, error, refresh } = useProfile();
  const { saveProfile, saving, error: saveError, clearError } = useSaveProfile();

  const birthProfile = profile?.birth_profile ?? null;
  const user = profile?.user;

  const initialPersonal = useMemo<PersonalFormState>(() => {
    const telegramFullName = buildFullTelegramName(user?.telegram.first_name, user?.telegram.last_name);

    const timeKnown =
      birthProfile?.birth_time_known ??
      (birthProfile?.birth_time_local ? true : false);

    return {
      displayName: user?.display_name ?? "",
      lang: user?.lang ?? "ru",
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
    user?.telegram.last_name
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
  const [activeSave, setActiveSave] = useState<"personal" | "widgets" | null>(null);

  useEffect(() => {
    setPersonal(initialPersonal);
  }, [initialPersonal]);

  useEffect(() => {
    setSelectedWidgets(initialWidgets);
  }, [initialWidgets]);

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
    if (saveError && activeSave) {
      const message = saveError || "Не удалось сохранить данные";
      if (activeSave === "personal") {
        setPersonalStatus({ type: "error", message });
      } else {
        setWidgetsStatus({ type: "error", message });
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

  const nameValid = personal.displayName.trim().length <= 80;
  const fullNameValid = personal.fullName.trim().length <= 80;
  const birthPlaceValid = personal.birthPlace.trim().length <= 80;
  const dateValid = !personal.birthDate || /^\d{4}-\d{2}-\d{2}$/.test(personal.birthDate);
  const timeValid =
    personal.timeUnknown ||
    (personal.birthTime.length > 0 && /^([01]\d|2[0-3]):[0-5]\d$/.test(personal.birthTime));

  const personalDirty =
    personal.displayName !== initialPersonal.displayName ||
    personal.lang !== initialPersonal.lang ||
    personal.fullName !== initialPersonal.fullName ||
    personal.birthDate !== initialPersonal.birthDate ||
    personal.birthTime !== initialPersonal.birthTime ||
    personal.timeUnknown !== initialPersonal.timeUnknown ||
    personal.birthPlace !== initialPersonal.birthPlace ||
    personal.gender !== initialPersonal.gender;

  const widgetsDirty = !arraysEqual(selectedWidgets, initialWidgets);

  const personalValid =
    nameValid && fullNameValid && birthPlaceValid && dateValid && timeValid;

  const handlePersonalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!personalDirty || !personalValid) {
      return;
    }

    setActiveSave("personal");
    setPersonalStatus(null);

    const payload: UpdateProfilePayload = {};

    if (personal.displayName !== initialPersonal.displayName) {
      payload.display_name = trimToNull(personal.displayName);
    }

    if (personal.lang !== initialPersonal.lang) {
      payload.lang = personal.lang;
    }

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
      birthPayload.birth_time_local = personal.timeUnknown ? null : personal.birthTime;
    }

    if (personal.birthPlace !== initialPersonal.birthPlace) {
      birthPayload.birth_place_text = trimToNull(personal.birthPlace);
    }

    if (personal.gender !== initialPersonal.gender) {
      birthPayload.gender = personal.gender || null;
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

  if (loading && !profile) {
    return (
      <div className="space-y-6">
        <Card className="glass-panel border-none">
          <CardContent className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted/30" />
            <div className="h-10 w-full animate-pulse rounded bg-muted/20" />
            <div className="h-10 w-full animate-pulse rounded bg-muted/20" />
            <div className="h-24 w-full animate-pulse rounded bg-muted/20" />
          </CardContent>
        </Card>
        <Card className="glass-panel border-none">
          <CardContent className="space-y-4">
            <div className="h-6 w-32 animate-pulse rounded bg-muted/30" />
            <div className="h-10 w-full animate-pulse rounded bg-muted/20" />
            <div className="h-10 w-full animate-pulse rounded bg-muted/20" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <Card className="glass-panel border-none p-6 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" onClick={() => refresh()}>
          Повторить
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg font-semibold">
            Личные данные
            {saving && activeSave === "personal" ? (
              <Loader2 className="h-4 w-4 animate-spin text-secondary" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handlePersonalSubmit}>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="displayName">
                  Отображаемое имя
                </label>
                <Input
                  id="displayName"
                  value={personal.displayName}
                  onChange={(event) => onPersonalFieldChange("displayName", event.target.value)}
                  placeholder="Например, Tarotolog"
                  maxLength={80}
                />
                {!nameValid ? (
                  <p className="text-xs text-destructive">Имя не должно превышать 80 символов</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="lang">
                  Язык приложения
                </label>
                <select
                  id="lang"
                  value={personal.lang}
                  onChange={(event) => onPersonalFieldChange("lang", event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  {LANG_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Данные рождения
                </h3>
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="fullName">
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
                    <label className="text-sm font-medium text-foreground" htmlFor="birthDate">
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
                    <label className="text-sm font-medium text-foreground" htmlFor="birthTime">
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
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <label className="text-sm font-medium text-foreground" htmlFor="birthPlace">
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
                  <p className="text-xs text-muted-foreground">TODO: подключить автокомплит по геоданным</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="gender">
                    Пол
                  </label>
                  <select
                    id="gender"
                    value={personal.gender}
                    onChange={(event) =>
                      onPersonalFieldChange("gender", event.target.value as GenderOption)
                    }
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {personalStatus ? (
              <div
                className={`rounded-xl px-4 py-2 text-sm ${
                  personalStatus.type === "success"
                    ? "bg-secondary/10 text-secondary"
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

      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg font-semibold">
            Что показывать на главной
            {saving && activeSave === "widgets" ? (
              <Loader2 className="h-4 w-4 animate-spin text-secondary" />
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleWidgetsSubmit}>
            <div className="space-y-3">
              {WIDGET_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-background/50 px-4 py-3"
                >
                  <span className="text-sm font-medium text-foreground">{WIDGET_LABELS[key]}</span>
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
                    ? "bg-secondary/10 text-secondary"
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
    </div>
  );
}
