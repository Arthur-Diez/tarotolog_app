import { useEffect } from "react";

import { useProfileState } from "@/stores/profileState";

export function useSaveProfile() {
  const { saveProfile, saving, saveError, clearSaveError } = useProfileState((state) => ({
    saveProfile: state.saveProfile,
    saving: state.saving,
    saveError: state.saveError,
    clearSaveError: state.clearSaveError
  }));

  useEffect(() => {
    if (saveError) {
      console.error("[Tarotolog] Ошибка сохранения профиля:", saveError);
      window.alert(saveError);
      clearSaveError();
    }
  }, [clearSaveError, saveError]);

  return {
    saveProfile,
    saving
  };
}
