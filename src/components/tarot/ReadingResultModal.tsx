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

  const cards = outputPayload?.cards ?? [];
  const interpretation = outputPayload?.interpretation;

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
            {summaryText || interpretation || "Скоро здесь появится интерпретация для вашей карты."}
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 text-white/80">
          <p className="text-sm uppercase tracking-[0.3em] text-white/50">Интерпретация</p>
          <p className="mt-2 text-sm leading-relaxed">{interpretation ?? "Интерпретация готовится..."}</p>
        </div>
        {cards.length > 0 && (
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Карты</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {cards.map((card) => (
                <span
                  key={`${card.position_index}-${card.card_code}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
                >
                  {card.card_code.replace("RWS_", "").replaceAll("_", " ")}
                  {card.reversed ? " (пер.)" : ""}
                </span>
              ))}
            </div>
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
