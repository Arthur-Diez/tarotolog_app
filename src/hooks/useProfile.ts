import { useEffect } from "react";

import { useProfileState } from "@/stores/profileState";

export function useProfile() {
  const { loading, error, profile, status, fetchProfile } = useProfileState((state) => ({
    loading: state.loading,
    error: state.error,
    profile: state.profile,
    status: state.status,
    fetchProfile: state.fetchProfile
  }));

  useEffect(() => {
    if (status === "idle" && !loading) {
      void fetchProfile();
    }
  }, [fetchProfile, loading, status]);

  return {
    loading,
    error,
    profile,
    refresh: fetchProfile
  };
}
