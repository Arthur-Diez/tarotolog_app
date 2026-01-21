import type React from "react";
import { useEffect, useMemo, useRef } from "react";

const DEFAULT_TASK_BLOCK_ID = "task-21501";

interface AdsGramTaskSlotProps {
  open: boolean;
  onReward: () => void;
  onDone: () => void;
  onError: () => void;
  onNotFound: () => void;
  onClose: () => void;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "adsgram-task": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "data-block-id"?: string;
        "data-debug"?: string;
      };
    }
  }
}

const isDev = Boolean(import.meta.env?.DEV);
const getBlockId = () =>
  (import.meta as { env?: Record<string, string> }).env?.VITE_ADSGRAM_BLOCK_ID ??
  DEFAULT_TASK_BLOCK_ID;

export function AdsGramTaskSlot({ open, onReward, onDone, onError, onNotFound, onClose }: AdsGramTaskSlotProps) {
  const taskRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || !taskRef.current) return;
    const taskEl = taskRef.current;

    const handleReward = () => {
      console.info("adsgram: reward");
      onReward();
    };
    const handleDone = () => {
      console.info("adsgram: done");
      onDone();
    };
    const handleError = () => {
      console.info("adsgram: error");
      onError();
    };
    const handleNotFound = () => {
      console.info("adsgram: banner_not_found");
      onNotFound();
    };

    taskEl.addEventListener("reward", handleReward);
    taskEl.addEventListener("done", handleDone);
    taskEl.addEventListener("onError", handleError);
    taskEl.addEventListener("onBannerNotFound", handleNotFound);

    return () => {
      taskEl.removeEventListener("reward", handleReward);
      taskEl.removeEventListener("done", handleDone);
      taskEl.removeEventListener("onError", handleError);
      taskEl.removeEventListener("onBannerNotFound", handleNotFound);
    };
  }, [open, onDone, onError, onNotFound, onReward]);

  const overlayClassName = useMemo(() => {
    if (!open) return "hidden";
    return "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4";
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className={overlayClassName}>
      <div className="w-full max-w-[420px] rounded-[24px] border border-white/10 bg-[var(--bg-card)]/90 p-4 shadow-[0_25px_45px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-secondary)]">Реклама</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--text-secondary)]"
          >
            Закрыть
          </button>
        </div>
        <div className="mt-3">
          <adsgram-task
            ref={taskRef}
            data-block-id={getBlockId()}
            data-debug={isDev ? "true" : undefined}
          />
        </div>
      </div>
    </div>
  );
}
