import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";

type AdsgramTaskEvent = Event & {
  detail?: unknown;
};

type AdsgramTaskBannerProps = {
  blockId: string;
  disabled?: boolean;
  debug?: boolean;
  className?: string;
  onReward: () => void;
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

  const isTaskBlockId = useMemo(() => /^task-\d+$/i.test(blockId.trim()), [blockId]);
  const isTaskElementRegistered = useMemo(() => {
    if (typeof window === "undefined") return true;
    return Boolean(window.customElements?.get("adsgram-task"));
  }, []);

  useEffect(() => {
    const node = taskRef.current;
    if (!node || disabled) return;

    const handleReward = () => onReward();
    const handleError = (event: Event) => onError?.(eventMessage(event as AdsgramTaskEvent));
    const handleBannerNotFound = () => onBannerNotFound?.();
    const handleTooLongSession = () => onTooLongSession?.();

    node.addEventListener("reward", handleReward);
    node.addEventListener("onError", handleError);
    node.addEventListener("error", handleError);
    node.addEventListener("onBannerNotFound", handleBannerNotFound);
    node.addEventListener("bannerNotFound", handleBannerNotFound);
    node.addEventListener("onTooLongSession", handleTooLongSession);
    node.addEventListener("tooLongSession", handleTooLongSession);

    return () => {
      node.removeEventListener("reward", handleReward);
      node.removeEventListener("onError", handleError);
      node.removeEventListener("error", handleError);
      node.removeEventListener("onBannerNotFound", handleBannerNotFound);
      node.removeEventListener("bannerNotFound", handleBannerNotFound);
      node.removeEventListener("onTooLongSession", handleTooLongSession);
      node.removeEventListener("tooLongSession", handleTooLongSession);
    };
  }, [disabled, onBannerNotFound, onError, onReward, onTooLongSession]);

  if (!isTaskBlockId) {
    return (
      <div className="rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 p-3 text-xs text-[var(--accent-gold)]">
        Неверный Task blockId: ожидается формат <code>task-xxx</code>.
      </div>
    );
  }

  if (!isTaskElementRegistered) {
    return (
      <div className="rounded-2xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/10 p-3 text-xs text-[var(--accent-gold)]">
        Компонент <code>adsgram-task</code> не загружен. Проверьте подключение SDK Adsgram.
      </div>
    );
  }

  return (
    <adsgram-task
      ref={(node) => {
        taskRef.current = node as HTMLElement | null;
      }}
      className={className}
      data-block-id={blockId.trim()}
      data-debug={debug ? "true" : "false"}
      data-debug-console={debug ? "true" : "false"}
      style={
        {
          width: "100%",
          display: "block",
          opacity: disabled ? 0.55 : 1,
          pointerEvents: disabled ? "none" : "auto",
          ["--adsgram-task-accent-color" as string]: "#80b9ff",
          ["--adsgram-task-background" as string]: "rgba(14, 22, 38, 0.88)",
          ["--adsgram-task-title-color" as string]: "#f3f6ff",
          ["--adsgram-task-description-color" as string]: "#bdc9df",
          ["--adsgram-task-button-background" as string]: "linear-gradient(120deg,#7ab5ff,#6f85ff)",
          ["--adsgram-task-button-color" as string]: "#ffffff",
          ["--adsgram-task-border-radius" as string]: "16px",
          ["--adsgram-task-padding" as string]: "12px"
        } as CSSProperties
      }
    >
      <span slot="reward">+1 ⚡</span>
      <span slot="button">Выполнить</span>
      <span slot="claim">Забрать</span>
      <span slot="done">Готово</span>
      <span slot="expired">Повторить</span>
    </adsgram-task>
  );
}
