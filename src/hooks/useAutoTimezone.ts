import { useEffect, useRef } from "react";

import type { ProfileResponse } from "@/lib/api";
import { useProfileState } from "@/stores/profileState";

export function useAutoTimezone(profile: ProfileResponse | null | undefined) {
  const saveProfile = useProfileState((state) => state.saveProfile);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    if (!profile?.user) return;

    const hasTimezone =
      typeof profile.user.current_tz_name === "string" &&
      profile.user.current_tz_name.length > 0 &&
      typeof profile.user.current_tz_offset_min === "number";

    if (hasTimezone) {
      attemptedRef.current = true;
      return;
    }

    const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
    const offset = -new Date().getTimezoneOffset();

    if (!tzName) {
      attemptedRef.current = true;
      return;
    }

    attemptedRef.current = true;
    void saveProfile({
      current_tz_name: tzName,
      current_tz_offset_min: offset
    });
  }, [profile, saveProfile]);
}
