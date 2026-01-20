import { useEffect, useMemo, useState } from "react";

import { initRichAds } from "@/lib/richads";

const RICHADS_CONTAINER_ID = "richads-top-banner";

interface RichAdsTopBannerProps {
  visible: boolean;
}

export function RichAdsTopBanner({ visible }: RichAdsTopBannerProps) {
  const [hidden, setHidden] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    let renderTimeout: number | undefined;

    const attempt = async () => {
      const controller = await initRichAds();
      if (cancelled) return;
      if (!controller) {
        setHidden(true);
        return;
      }

      if (typeof controller.render === "function") {
        controller.render({ containerId: RICHADS_CONTAINER_ID });
        renderTimeout = window.setTimeout(() => {
          const container = document.getElementById(RICHADS_CONTAINER_ID);
          if (!container || container.childElementCount === 0) {
            setHidden(true);
          }
        }, 2500);
      } else {
        setHidden(true);
        return;
      }

      setInitialized(true);
    };

    attempt().catch(() => {
      if (!cancelled) {
        setHidden(true);
      }
    });

    return () => {
      cancelled = true;
      if (renderTimeout) {
        window.clearTimeout(renderTimeout);
      }
    };
  }, [visible]);

  const containerClassName = useMemo(() => {
    const base =
      "rounded-[24px] border border-white/10 bg-[var(--bg-card)]/80 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out";
    if (initialized) {
      return `${base} translate-y-0 opacity-100`;
    }
    return `${base} translate-y-1 opacity-90`;
  }, [initialized]);

  if (!visible || hidden) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <div className="min-h-[120px]" id={RICHADS_CONTAINER_ID} />
    </div>
  );
}
