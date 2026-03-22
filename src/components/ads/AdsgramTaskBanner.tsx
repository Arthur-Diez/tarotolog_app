import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type AdsgramTaskEvent = Event & {
  detail?: unknown;
};

type AdsgramTaskBannerProps = {
  blockId: string;
  disabled?: boolean;
  debug?: boolean;
  className?: string;
  onReward: (detail?: unknown) => void;
  onError?: (message: string) => void;
  onBannerNotFound?: () => void;
  onTooLongSession?: () => void;
};

function eventMessage(event: AdsgramTaskEvent): string {
  const detail = event.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    const maybeMessage = (detail as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "Task-реклама временно недоступна";
}

export function AdsgramTaskBanner({
  blockId,
  disabled = false,
  debug = false,
  className,
  onReward,
  onError,
  onBannerNotFound,
  onTooLongSession
}: AdsgramTaskBannerProps) {
  const taskRef = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);

  const normalizedBlockId = useMemo(() => blockId.trim(), [blockId]);
  const isTaskBlockId = useMemo(() => /^task-\d+$/i.test(normalizedBlockId), [normalizedBlockId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.customElements?.get("adsgram-task")) {
      setReady(true);
      return;
    }
    let cancelled = false;
    window.customElements
      .whenDefined("adsgram-task")
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setReady(false);
          onError?.("Task-реклама сейчас недоступна");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  useEffect(() => {
    if (!isTaskBlockId) {
      onError?.("Неверный Task blockId");
      return;
    }
  }, [isTaskBlockId, onError]);

  useEffect(() => {
    const node = taskRef.current;
    if (!node || disabled || !ready) return;

    const handleReward = (event: AdsgramTaskEvent) => onReward(event.detail);
    const handleError = (event: Event) => onError?.(eventMessage(event as AdsgramTaskEvent));
    const handleBannerNotFound = () => onBannerNotFound?.();
    const handleTooLongSession = () => onTooLongSession?.();

    node.addEventListener("reward", handleReward);
    node.addEventListener("onError", handleError);
    node.addEventListener("onBannerNotFound", handleBannerNotFound);
    node.addEventListener("onTooLongSession", handleTooLongSession);

    return () => {
      node.removeEventListener("reward", handleReward);
      node.removeEventListener("onError", handleError);
      node.removeEventListener("onBannerNotFound", handleBannerNotFound);
      node.removeEventListener("onTooLongSession", handleTooLongSession);
    };
  }, [disabled, onBannerNotFound, onError, onReward, onTooLongSession, ready]);

  if (!isTaskBlockId) {
    return null;
  }

  if (!ready) {
    return null;
  }

  return (
    <adsgram-task
      ref={(node) => {
        taskRef.current = node as HTMLElement | null;
      }}
      className={className}
      data-block-id={normalizedBlockId}
      data-debug={debug ? "true" : "false"}
      data-debug-console={debug ? "true" : "false"}
      style={
        {
          width: "100%",
          display: "block",
          maxWidth: "100%",
          overflow: "hidden",
          opacity: disabled ? 0.55 : 1,
          pointerEvents: disabled ? "none" : "auto",
          ["--adsgram-task-accent-color" as string]: "#80b9ff",
          ["--adsgram-task-background" as string]: "rgba(14, 22, 38, 0.88)",
          ["--adsgram-task-title-color" as string]: "#f3f6ff",
          ["--adsgram-task-description-color" as string]: "#bdc9df",
          ["--adsgram-task-button-background" as string]: "linear-gradient(120deg,#7ab5ff,#6f85ff)",
          ["--adsgram-task-button-color" as string]: "#ffffff",
          ["--adsgram-task-border-radius" as string]: "16px",
          ["--adsgram-task-padding" as string]: "12px",
          ["--adsgram-task-button-border-radius" as string]: "12px"
        } as CSSProperties
      }
    >
      <span slot="reward">+1 ⚡</span>
      <span slot="button">GO</span>
      <span slot="claim">CLAIM</span>
      <span slot="done">Готово</span>
      <span slot="expired">Повторить</span>
    </adsgram-task>
  );
}
