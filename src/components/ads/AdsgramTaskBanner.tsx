import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ADGRAM_SCRIPT_URL, ADGRAM_TASK_UNIT_ID } from "@/config/ads";

import styles from "./AdsgramTaskBanner.module.css";

let adsgramScriptPromise: Promise<void> | null = null;
const ADSGRAM_COMPONENT_TAG = "adsgram-task";
const ADSGRAM_READY_TIMEOUT = 4000;
const ADSGRAM_RENDER_TIMEOUT = 2500;
const ADSGRAM_MIN_HEIGHT = 120;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "adsgram-task": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "data-block-id"?: string;
        "data-debug"?: string;
        "data-debug-console"?: string;
      };
    }
  }
}

interface AdsgramTaskBannerProps {
  visible: boolean;
  loading: boolean;
}

const isDev = Boolean(import.meta.env?.DEV);
const devLog = (...args: Array<string | Error>) => {
  if (isDev) {
    console.info(...args);
  }
};

function loadAdsgramScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (customElements.get(ADSGRAM_COMPONENT_TAG)) {
    return Promise.resolve();
  }

  if (!adsgramScriptPromise) {
    adsgramScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${ADGRAM_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Adsgram script failed")));
        return;
      }

      const script = document.createElement("script");
      script.src = ADGRAM_SCRIPT_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Adsgram script failed"));
      document.head.appendChild(script);
    });
  }

  return adsgramScriptPromise;
}

async function waitForAdsgramElement(): Promise<void> {
  if (customElements.get(ADSGRAM_COMPONENT_TAG)) {
    return;
  }

  await Promise.race([
    customElements.whenDefined(ADSGRAM_COMPONENT_TAG),
    new Promise((_, reject) =>
      window.setTimeout(() => reject(new Error("Adsgram component timeout")), ADSGRAM_READY_TIMEOUT)
    )
  ]);
}

export function AdsgramTaskBanner({ visible, loading }: AdsgramTaskBannerProps) {
  const taskRef = useRef<HTMLElement | null>(null);
  const [hidden, setHidden] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [tooLongMessage, setTooLongMessage] = useState(false);

  const shouldShowSkeleton = loading && !visible;

  useEffect(() => {
    if (visible) {
      setHidden(false);
      setRendered(false);
      setTooLongMessage(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    loadAdsgramScript()
      .then(() => waitForAdsgramElement())
      .then(() => {
        if (!cancelled) {
          devLog("adsgram: loaded");
          setScriptReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          devLog("adsgram: render failed");
          setHidden(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible || !scriptReady || !taskRef.current) return;
    const taskElement = taskRef.current;

    const mountedTimeout = window.setTimeout(() => {
      const hasShadow = Boolean(taskElement.shadowRoot);
      const hasContent = Boolean(taskElement.innerHTML.trim());
      const hasChildren = taskElement.childElementCount > 0;
      const isRendered = hasShadow || hasContent || hasChildren;
      if (!isRendered) {
        devLog("adsgram: render failed");
        setHidden(true);
      } else {
        devLog("adsgram: render ok");
        setRendered(true);
      }
    }, ADSGRAM_RENDER_TIMEOUT);

    const handleError = () => {
      devLog("adsgram: render failed");
      setHidden(true);
    };

    const handleTooLong = () => {
      devLog("adsgram: too long session");
      setHidden(true);
      setTooLongMessage(true);
    };

    taskElement.addEventListener("onError", handleError);
    taskElement.addEventListener("onBannerNotFound", handleError);
    taskElement.addEventListener("onTooLongSession", handleTooLong);
    taskElement.addEventListener("reward", () => {
      devLog("adsgram: reward");
    });

    return () => {
      window.clearTimeout(mountedTimeout);
      taskElement.removeEventListener("onError", handleError);
      taskElement.removeEventListener("onBannerNotFound", handleError);
      taskElement.removeEventListener("onTooLongSession", handleTooLong);
    };
  }, [scriptReady, visible]);

  const containerClassName = useMemo(() => {
    const base =
      "rounded-[24px] border border-white/10 bg-[var(--bg-card)]/80 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out";
    if (rendered) {
      return `${base} translate-y-0 opacity-100`;
    }
    if (visible) {
      return `${base} translate-y-1 opacity-90`;
    }
    return base;
  }, [rendered, visible]);

  if (tooLongMessage) {
    return (
      <div className={containerClassName}>
        <p className="text-sm text-[var(--text-secondary)]">
          Перезапустите приложение, чтобы появились задания
        </p>
      </div>
    );
  }

  if (hidden) {
    return null;
  }

  if (shouldShowSkeleton) {
    return (
      <div className={containerClassName}>
        <div className="min-h-[120px] w-full animate-pulse rounded-[18px] border border-white/10 bg-white/5" />
      </div>
    );
  }

  if (!visible) {
    return null;
  }

  return (
    <div className={containerClassName}>
      {!scriptReady ? (
        <div className="min-h-[120px] w-full animate-pulse rounded-[18px] border border-white/10 bg-white/5" />
      ) : (
        <adsgram-task
          className={styles.task}
          data-block-id={ADGRAM_TASK_UNIT_ID}
          data-debug={isDev ? "true" : undefined}
          data-debug-console="false"
          ref={taskRef}
          style={{ minHeight: ADSGRAM_MIN_HEIGHT }}
        >
          <span slot="reward" className={styles.reward}>
            100 ⚡
          </span>
          <div slot="button" className={styles.button}>
            Перейти
          </div>
          <div slot="claim" className={styles.buttonClaim}>
            Забрать
          </div>
          <div slot="done" className={styles.buttonDone}>
            Готово
          </div>
        </adsgram-task>
      )}
    </div>
  );
}
