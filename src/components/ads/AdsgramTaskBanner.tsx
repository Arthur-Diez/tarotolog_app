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
          minWidth: "0",
          display: "block",
          boxSizing: "border-box",
          maxWidth: "100%",
          overflow: "hidden",
          opacity: disabled ? 0.55 : 1,
          pointerEvents: disabled ? "none" : "auto",
          ["--adsgram-task-accent-color" as string]: "#8ec4ff",
          ["--adsgram-task-background" as string]: "rgba(16, 25, 42, 0.92)",
          ["--adsgram-task-title-color" as string]: "#f6f8ff",
          ["--adsgram-task-description-color" as string]: "#c6d3ea",
          ["--adsgram-task-button-background" as string]: "linear-gradient(135deg,#61B4FF,#4A8BFF)",
          ["--adsgram-task-button-color" as string]: "#ffffff",
          ["--adsgram-task-border-radius" as string]: "16px",
          ["--adsgram-task-padding" as string]: "8px 10px",
          ["--adsgram-task-button-border-radius" as string]: "11px"
        } as CSSProperties
      }
    >
      <span
        slot="reward"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 7px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.08)",
          fontWeight: 600,
          fontSize: "14px",
          color: "#eef5ff"
        }}
      >
        +2 ⚡
      </span>
      <span
        slot="button"
        style={{
          display: "inline-block",
          minWidth: "42px",
          textAlign: "center",
          marginInlineStart: "0",
          position: "static",
          whiteSpace: "nowrap",
          borderRadius: "10px",
          padding: "4px 7px",
          background: "linear-gradient(135deg,#64B8FF,#4C8FFF)",
          color: "#ffffff",
          fontWeight: 700,
          letterSpacing: "0.02em",
          boxShadow: "0 8px 20px rgba(76,143,255,0.4)"
        }}
      >
        go
      </span>
      <span
        slot="claim"
        style={{
          display: "inline-block",
          minWidth: "50px",
          textAlign: "center",
          marginInlineStart: "0",
          position: "static",
          whiteSpace: "nowrap",
          borderRadius: "10px",
          padding: "5px 8px",
          background: "linear-gradient(135deg,#F1AE2F,#F08A2C)",
          color: "#fffdf8",
          fontWeight: 700,
          letterSpacing: "0.02em"
        }}
      >
        CLAIM
      </span>
      <span slot="done">Готово</span>
      <span slot="expired">Повторить</span>
    </adsgram-task>
  );
}
