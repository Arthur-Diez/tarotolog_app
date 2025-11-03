import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_WIDGET_KEYS, type UpdateProfilePayload, type WidgetKey } from "@/lib/api";
import { useProfileState } from "@/stores/profileState";

const WIDGET_OPTIONS: Array<{ key: WidgetKey; label: string; description?: string }> = [
  { key: "card_of_day", label: "Карта дня" },
  { key: "daily_spread", label: "Расклад на день" },
  { key: "individual_horoscope", label: "Индивидуальный гороскоп" },
  { key: "astro_forecast", label: "Астропрогноз" },
  { key: "numerology_forecast", label: "Нумерологический прогноз" }
];

const GENDER_OPTIONS = [
  { value: "", label: "Не указано" },
  { value: "female", label: "Женский" },
  { value: "male", label: "Мужской" },
  { value: "other", label: "Другое" }
];

interface ProfileFormState {
  first_name: string;
  last_name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  gender: "male" | "female" | "other" | "";
  is_premium: boolean;
  energy_balance: string;
}

const emptyForm: ProfileFormState = {
  first_name: "",
  last_name: "",
  birth_date: "",
  birth_time: "",
  birth_place: "",
  gender: "",
  is_premium: false,
  energy_balance: "0"
};

export default function ProfilePage() {
  const { profile, widgets, status, saving, error, fetchProfile, saveProfile } = useProfileState(
    (state) => ({
      profile: state.profile,
      widgets: state.widgets,
      status: state.status,
      saving: state.saving,
      error: state.error,
      fetchProfile: state.fetchProfile,
      saveProfile: state.saveProfile
    })
  );

  const [formState, setFormState] = useState<ProfileFormState>(emptyForm);
  const [selectedWidgets, setSelectedWidgets] = useState<WidgetKey[]>(widgets);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (status === "idle") {
      void fetchProfile();
    }
  }, [fetchProfile, status]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFormState({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      birth_date: profile.birth_date ?? "",
      birth_time: profile.birth_time ?? "",
      birth_place: profile.birth_place ?? "",
      gender: profile.gender ?? "",
      is_premium: Boolean(profile.is_premium),
      energy_balance: String(profile.energy_balance ?? 0)
    });
  }, [profile]);

  useEffect(() => {
    setSelectedWidgets(widgets.length ? widgets : [...DEFAULT_WIDGET_KEYS]);
  }, [widgets]);

  useEffect(() => {
    if (!saving && savedAt) {
      const timeout = window.setTimeout(() => setSavedAt(null), 4000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [saving, savedAt]);

  const isLoading = useMemo(() => status === "loading" && !profile, [profile, status]);

  const handleInputChange = (key: keyof ProfileFormState, value: string | boolean) => {
    setFormState((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleWidgetToggle = (widget: WidgetKey) => {
    setSelectedWidgets((prev) => {
      if (prev.includes(widget)) {
        return prev.filter((item) => item !== widget);
      }
      return [...prev, widget];
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedWidgets = selectedWidgets.length ? selectedWidgets : [...DEFAULT_WIDGET_KEYS];

    const payload: UpdateProfilePayload = {
      first_name: formState.first_name.trim() || null,
      last_name: formState.last_name.trim() || null,
      birth_date: formState.birth_date || null,
      birth_time: formState.birth_time || null,
      birth_place: formState.birth_place.trim() || null,
      gender: formState.gender ? formState.gender : null,
      is_premium: formState.is_premium,
      energy_balance: Number(formState.energy_balance) || 0,
      widgets: normalizedWidgets
    };

    const result = await saveProfile(payload);
    if (result) {
      setSavedAt(Date.now());
    }
  };

  return (
    <div className="space-y-6">
      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg">
            <span>Профиль Tarotolog</span>
            {saving ? <Loader2 className="h-5 w-5 animate-spin text-secondary" /> : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загружаем данные профиля…
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm font-medium text-foreground">Имя</label>
                  <Input
                    value={formState.first_name}
                    onChange={(event) => handleInputChange("first_name", event.target.value)}
                    placeholder="Например, Алина"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm font-medium text-foreground">Фамилия</label>
                  <Input
                    value={formState.last_name}
                    onChange={(event) => handleInputChange("last_name", event.target.value)}
                    placeholder="Например, Таро"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Дата рождения</label>
                    <Input
                      type="date"
                      value={formState.birth_date}
                      onChange={(event) => handleInputChange("birth_date", event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Время</label>
                    <Input
                      type="time"
                      value={formState.birth_time}
                      onChange={(event) => handleInputChange("birth_time", event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Место</label>
                    <Input
                      value={formState.birth_place}
                      onChange={(event) => handleInputChange("birth_place", event.target.value)}
                      placeholder="Город рождения"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Пол</label>
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                      value={formState.gender}
                      onChange={(event) =>
                        handleInputChange("gender", event.target.value as ProfileFormState["gender"])
                      }
                    >
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-foreground">Энергия</label>
                    <Input
                      type="number"
                      min={0}
                      value={formState.energy_balance}
                      onChange={(event) => handleInputChange("energy_balance", event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-secondary/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Tarotolog Premium</p>
                    <p className="text-xs text-muted-foreground">Доступ к эксклюзивным раскладам и прогнозам</p>
                  </div>
                  <Switch
                    checked={formState.is_premium}
                    onCheckedChange={(value) => handleInputChange("is_premium", value)}
                  />
                </div>
              </div>

              <Card className="border-none bg-secondary/5">
                <CardHeader>
                  <CardTitle className="text-base">Мои виджеты на главной</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {WIDGET_OPTIONS.map((widget) => (
                    <label key={widget.key} className="flex items-center justify-between gap-4 rounded-2xl bg-background/40 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{widget.label}</p>
                        {widget.description ? (
                          <p className="text-xs text-muted-foreground">{widget.description}</p>
                        ) : null}
                      </div>
                      <Checkbox
                        checked={selectedWidgets.includes(widget.key)}
                        onChange={() => handleWidgetToggle(widget.key)}
                      />
                    </label>
                  ))}
                </CardContent>
              </Card>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {savedAt && !saving ? (
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <CheckCircle2 className="h-4 w-4" />
                  Настройки сохранены
                </div>
              ) : null}

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Сохраняем..." : "Сохранить"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-none bg-secondary/5">
        <CardContent className="flex items-center gap-4 p-5 text-sm text-muted-foreground">
          <Sparkles className="h-5 w-5 text-secondary" />
          <p>
            Настройки профиля помогают персонализировать Tarotolog и синхронизироваться с вашим
            ботом в Telegram.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
