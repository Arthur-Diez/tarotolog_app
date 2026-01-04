import { useEffect, useRef } from "react";

import type { ProfileResponse } from "@/lib/api";
import { detectDeviceTimezone } from "@/lib/timezone";
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

    if (typeof window === "undefined") return;

    const timer = window.setTimeout(() => {
      if (attemptedRef.current) return;
      const detected = detectDeviceTimezone();
      if (!detected.name || typeof detected.offset !== "number") {
        attemptedRef.current = true;
        return;
      }

      attemptedRef.current = true;
      void saveProfile({
        birth_profile: {
          current_tz_name: detected.name,
          current_tz_offset_min: detected.offset,
          current_tz_confirmed: false
        }
      });
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [profile, saveProfile]);
}
