import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import type { ReadingOutputPayload } from "@/lib/api";

interface ReadingResultModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  summaryText?: string | null;
  outputPayload?: ReadingOutputPayload | null;
}

export function ReadingResultModal({
  open,
  onClose,
  onSave,
  summaryText,
  outputPayload,
}: ReadingResultModalProps) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  const positions = outputPayload?.positions ?? [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <div className="w-full max-w-md space-y-5 rounded-3xl bg-[#1c1538] p-6 text-white shadow-2xl">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-white/60">Послание дня</p>
          <h2 className="text-2xl font-semibold text-white">Интерпретация расклада</h2>
        </div>
        <div className="space-y-3 rounded-2xl bg-white/5 p-4 text-left">
          <p className="text-sm text-white/70">Краткий итог</p>
          <p className="text-base font-medium text-white">
            {summaryText || "Скоро здесь появится интерпретация для вашей карты."}
          </p>
        </div>
        {positions.length > 0 && (
          <div className="max-h-64 space-y-4 overflow-y-auto rounded-2xl bg-white/5 p-4">
            {positions.map((position) => (
              <div key={position.position_index} className="space-y-1">
                <p className="text-sm font-semibold text-secondary">
                  {position.title || `Позиция ${position.position_index}`}
                </p>
                <p className="text-sm text-white/80">
                  {position.full_text || position.short_text || "Интерпретация готовится..."}
                </p>
              </div>
            ))}
          </div>
        )}
        {positions.length === 0 && (
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/70">
            Детальная расшифровка пока недоступна. Попробуйте обновить страницу чуть позже.
          </div>
        )}
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button variant="ghost" className="flex-1 bg-white/10" onClick={onClose}>
            Закрыть
          </Button>
          <Button className="flex-1" onClick={onSave}>
            Сохранить расклад в дневнике
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
