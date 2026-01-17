import type React from "react";
import { useEffect, useRef, useState } from "react";

const ADSGRAM_BLOCK_ID = "task-21309";
const ADSGRAM_SCRIPT_SRC = "https://static.adsgram.ai/adsgram.min.js";

let adsgramScriptPromise: Promise<void> | null = null;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "adsgram-task": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "block-id"?: string;
      };
    }
  }
}

interface AdsTaskBannerProps {
  visible: boolean;
}

function loadAdsgramScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (customElements.get("adsgram-task")) {
    return Promise.resolve();
  }

  if (!adsgramScriptPromise) {
    adsgramScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${ADSGRAM_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Adsgram script failed")));
        return;
      }

      const script = document.createElement("script");
      script.src = ADSGRAM_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Adsgram script failed"));
      document.head.appendChild(script);
    });
  }

  return adsgramScriptPromise;
}

export function AdsTaskBanner({ visible }: AdsTaskBannerProps) {
  const bannerRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    loadAdsgramScript()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHidden(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!ready || !bannerRef.current) return;
    const node = bannerRef.current;

    const handleReward = () => {
      console.info("[Adsgram] reward event");
    };
    const handleNoFill = () => {
      setHidden(true);
    };

    node.addEventListener("reward", handleReward);
    node.addEventListener("bannerNotFound", handleNoFill);
    node.addEventListener("noFill", handleNoFill);

    return () => {
      node.removeEventListener("reward", handleReward);
      node.removeEventListener("bannerNotFound", handleNoFill);
      node.removeEventListener("noFill", handleNoFill);
    };
  }, [ready]);

  if (!visible || hidden) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-[var(--bg-card)]/80 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out">
      <div className="min-h-[84px]">
        {ready ? (
          <adsgram-task ref={bannerRef} block-id={ADSGRAM_BLOCK_ID} />
        ) : (
          <div className="h-[84px] w-full animate-pulse rounded-[18px] border border-white/10 bg-white/5" />
        )}
      </div>
    </div>
  );
}
