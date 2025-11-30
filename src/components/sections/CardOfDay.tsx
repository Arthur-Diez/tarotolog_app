import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CardOfDayProps {
  card: {
    title: string;
    subtitle: string;
    keywords: string[];
    affirmation: string;
    description: string;
  };
}

export function CardOfDay({ card }: CardOfDayProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Card className="relative overflow-hidden border border-[rgba(217,194,163,0.25)] bg-[var(--bg-card-strong)] text-[var(--text-primary)] shadow-[0_40px_70px_rgba(0,0,0,0.6)]">
      <motion.div
        className="absolute inset-0 opacity-70"
        animate={{ opacity: flipped ? 0.85 : 0.7 }}
        transition={{ duration: 0.4 }}
        style={{ background: "radial-gradient(circle at top, rgba(238,205,245,0.22), transparent 65%)" }}
      />
      <CardHeader className="relative z-10 flex items-center justify-between text-[var(--text-primary)]">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--text-tertiary)]">Карта дня</p>
          <CardTitle className="mt-1 text-3xl font-semibold text-[var(--accent-pink)] mystic-heading">
            {card.title}
          </CardTitle>
        </div>
        <Sparkles className="h-6 w-6 text-[var(--accent-gold)]" strokeWidth={1.4} />
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex h-64 flex-col items-center justify-center" style={{ perspective: "1000px" }}>
          <motion.div
            onClick={() => setFlipped((prev) => !prev)}
            className="relative h-52 w-36 cursor-pointer"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <div
              className="absolute inset-0 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-white/30 via-white/10 to-transparent p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-tertiary)]">
                    Совет вселенной
                  </p>
                  <h4 className="mt-2 text-base font-semibold text-[var(--text-primary)]">{card.subtitle}</h4>
                </div>
                <div className="space-y-1">
                  {card.keywords.map((keyword) => (
                    <p key={keyword} className="text-xs text-[var(--text-secondary)]">
                      • {keyword}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div
              className="absolute inset-0 flex h-full flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-4 text-left"
              style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-tertiary)]">Аффирмация</p>
                <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{card.affirmation}</p>
              </div>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{card.description}</p>
            </div>
          </motion.div>
          <p className="mt-4 text-xs text-[var(--text-tertiary)]">Нажми на карту, чтобы узнать подробности</p>
        </div>
      </CardContent>
    </Card>
  );
}
