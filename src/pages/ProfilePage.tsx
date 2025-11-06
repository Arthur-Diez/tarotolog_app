import { FormEvent, useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DEFAULT_WIDGET_KEYS, WIDGET_KEYS, type WidgetKey } from "@/lib/api";
import { useProfile } from "@/hooks/useProfile";
import { useSaveProfile } from "@/hooks/useSaveProfile";
import { normalizeWidgets } from "@/stores/profileState";

const LANG_OPTIONS = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "system", label: "Системный" }
];

const widgetLabels: Record<WidgetKey, string> = {
  card_of_day: "Карта дня",
  daily_spread: "Ежедневный расклад",
  individual_horoscope: "Индивидуальный гороскоп",
  astro_forecast: "Астропрогноз",
  numerology_forecast: "Нумерологический прогноз"
};

export default function ProfilePage() {
  const { profile, loading, error, refresh } = useProfile();
  const { saveProfile, saving } = useSaveProfile();
  const user = profile?.user;
  const preferences = profile?.preferences;

  const initialWidgets = useMemo(
    () =>
      preferences?.widgets && preferences.widgets.length
        ? normalizeWidgets(preferences.widgets)
        : DEFAULT_WIDGET_KEYS,
    [preferences]
  );

  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [lang, setLang] = useState(user?.lang ?? "ru");
  const [widgets, setWidgets] = useState<WidgetKey[]>(initialWidgets);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name ?? "");
      setLang(user.lang ?? "ru");
    }
  }, [user?.display_name, user?.lang]);

  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  useEffect(() => {
    if (savedMessage) {
      const timeout = window.setTimeout(() => setSavedMessage(null), 3000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [savedMessage]);

  const toggleWidget = (key: WidgetKey) => {
    setWidgets((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payloadWidgets = widgets.length ? widgets : DEFAULT_WIDGET_KEYS;
    const payloadLang = lang || null;

    const result = await saveProfile({
      display_name: displayName.trim() || null,
      lang: payloadLang,
      widgets: payloadWidgets
    });

    if (result) {
      setSavedMessage("Настройки сохранены");
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
    <div className="space-y-6">
      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg font-semibold">
            Профиль
            {saving ? <Loader2 className="h-4 w-4 animate-spin text-secondary" /> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="displayName">
                  Отображаемое имя
                </label>
                <Input
                  id="displayName"
                  value={displayName}
                  maxLength={64}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Например, Tarotolog"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground" htmlFor="lang">
                  Язык приложения
                </label>
                <select
                  id="lang"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  value={lang}
                  onChange={(event) => setLang(event.target.value)}
                >
                  {LANG_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2 text-sm">
              <span className="font-medium text-foreground">Telegram</span>
              <p className="rounded-xl border border-dashed border-secondary/20 px-4 py-2 text-muted-foreground">
                @{user?.telegram.username ?? "—"}
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
                <span>Имя: {user?.telegram.first_name ?? "—"}</span>
                <span>Фамилия: {user?.telegram.last_name ?? "—"}</span>
                <span>Premium: {user?.telegram.is_premium ? "да" : "нет"}</span>
                <span>Язык: {user?.lang ?? "—"}</span>
              </div>
            </div>

            <div className="rounded-xl bg-secondary/10 px-4 py-3">
              <p className="text-sm font-medium text-foreground">Энергия</p>
              <p className="text-2xl font-semibold text-secondary">{user?.energy_balance ?? 0} ⚡</p>
            </div>

            <Card className="border-none bg-secondary/5">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Что показывать на главной</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {WIDGET_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-background/60 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{widgetLabels[key]}</p>
                    </div>
                    <Checkbox checked={widgets.includes(key)} onChange={() => toggleWidget(key)} />
                  </label>
                ))}
              </CardContent>
            </Card>

            {savedMessage ? (
              <div className="rounded-xl bg-secondary/10 px-4 py-2 text-sm text-secondary">
                {savedMessage}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-panel border-none bg-secondary/5">
        <CardContent className="flex items-center gap-4 p-5 text-sm text-muted-foreground">
          <Sparkles className="h-5 w-5 text-secondary" />
          <p>
            Настройки профиля управляют тем, какие виджеты вы видите на главной странице, и помогут
            сделать ваш опыт в Tarotolog персональным.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
