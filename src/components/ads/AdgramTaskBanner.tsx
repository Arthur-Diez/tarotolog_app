import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ADGRAM_SCRIPT_URL, ADGRAM_TASK_UNIT_ID } from "@/config/ads";

let adgramScriptPromise: Promise<void> | null = null;
const ADGRAM_CONTAINER_ID = "adgram-task-top";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "adsgram-task": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "block-id"?: string;
      };
    }
  }
}

interface AdgramTaskBannerProps {
  visible: boolean;
  loading: boolean;
}

function loadAdgramScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (customElements.get("adsgram-task")) {
    return Promise.resolve();
  }

  if (!adgramScriptPromise) {
    adgramScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${ADGRAM_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Adgram script failed")));
        return;
      }

      const script = document.createElement("script");
      script.src = ADGRAM_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Adgram script failed"));
      document.head.appendChild(script);
    });
  }

  return adgramScriptPromise;
}

export function AdgramTaskBanner({ visible, loading }: AdgramTaskBannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  const shouldShowSkeleton = loading && !visible;

  useEffect(() => {
    if (visible) {
      setHidden(false);
      setRendered(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    loadAdgramScript()
      .then(() => {
        if (!cancelled) {
          console.info("adgram: loaded");
          setScriptReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          console.info("adgram: render failed");
          setHidden(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !scriptReady || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = "";

    const taskElement = document.createElement("adsgram-task");
    taskElement.setAttribute("block-id", ADGRAM_TASK_UNIT_ID);
    container.appendChild(taskElement);

    const mountedTimeout = window.setTimeout(() => {
      const hasShadow = Boolean(taskElement.shadowRoot);
      const hasContent = Boolean(taskElement.innerHTML.trim());
      const hasChildren = taskElement.childElementCount > 0;
      const isRendered = hasShadow || hasContent || hasChildren;
      if (!isRendered) {
        console.info("adgram: render failed");
        setHidden(true);
      } else {
        console.info("adgram: render ok");
        setRendered(true);
      }
    }, 2000);

    const handleNoFill = () => {
      console.info("adgram: render failed");
      setHidden(true);
    };

    taskElement.addEventListener("bannerNotFound", handleNoFill);
    taskElement.addEventListener("noFill", handleNoFill);
    taskElement.addEventListener("reward", () => {
      console.info("adgram: reward");
    });

    return () => {
      window.clearTimeout(mountedTimeout);
      taskElement.removeEventListener("bannerNotFound", handleNoFill);
      taskElement.removeEventListener("noFill", handleNoFill);
    };
  }, [scriptReady, visible]);

  const containerClassName = useMemo(() => {
    const base = "rounded-[24px] border border-white/10 bg-[var(--bg-card)]/80 p-3 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out";
    if (rendered) {
      return `${base} translate-y-0 opacity-100`;
    }
    if (visible) {
      return `${base} translate-y-1 opacity-90`;
    }
    return base;
  }, [rendered, visible]);

  if (hidden) {
    return null;
  }

  if (shouldShowSkeleton) {
    return (
      <div className={containerClassName}>
        <div className="min-h-[84px] w-full animate-pulse rounded-[18px] border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <div className={containerClassName}>
      <div className="min-h-[84px]" id={ADGRAM_CONTAINER_ID} ref={containerRef} />
    </div>
  );
}
