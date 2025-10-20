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
    <Card className="relative overflow-hidden border-none bg-gradient-to-br from-[#1f153b]/80 via-[#2d1d4f]/80 to-[#402262]/80 text-white shadow-glow">
      <motion.div
        className="absolute inset-0 opacity-70"
        animate={{ opacity: flipped ? 0.85 : 0.7 }}
        transition={{ duration: 0.4 }}
        style={{ background: "radial-gradient(circle at top, rgba(255,255,255,0.2), transparent 65%)" }}
      />
      <CardHeader className="relative z-10 flex items-center justify-between text-white">
        <div>
          <p className="text-sm uppercase tracking-wider text-white/60">Карта дня</p>
          <CardTitle className="mt-1 text-2xl font-semibold text-white">{card.title}</CardTitle>
        </div>
        <Sparkles className="h-6 w-6 text-white/70" />
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
            <div className="absolute inset-0 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm" style={{ backfaceVisibility: "hidden" }}>
              <div className="flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br from-white/40 via-white/20 to-white/5 p-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/70">Совет Вселенной</p>
                  <h4 className="mt-2 text-lg font-semibold text-white">{card.subtitle}</h4>
                </div>
                <div className="space-y-1">
                  {card.keywords.map((keyword) => (
                    <p key={keyword} className="text-xs text-white/80">
                      • {keyword}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div
              className="absolute inset-0 flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/10 p-4 text-left"
              style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">Аффирмация</p>
                <p className="mt-2 text-base font-semibold text-white">{card.affirmation}</p>
              </div>
              <p className="text-xs leading-relaxed text-white/80">{card.description}</p>
            </div>
          </motion.div>
          <p className="mt-4 text-xs text-white/70">Нажми на карту, чтобы узнать подробности</p>
        </div>
      </CardContent>
    </Card>
  );
}
