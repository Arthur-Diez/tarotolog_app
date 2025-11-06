import { useProfileState } from "@/stores/profileState";

export function useSaveProfile() {
  const { saveProfile, saving, saveError, clearSaveError } = useProfileState((state) => ({
    saveProfile: state.saveProfile,
    saving: state.saving,
    saveError: state.saveError,
    clearSaveError: state.clearSaveError
  }));

  return {
    saveProfile,
    saving,
    error: saveError,
    clearError: clearSaveError
  };
}
