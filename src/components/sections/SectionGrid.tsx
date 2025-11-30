import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface SectionItem {
  id: string;
  title: string;
  description: string;
  icon: JSX.Element;
}

export interface SectionGridProps {
  sections: SectionItem[];
  onSectionSelect?: (id: string) => void;
}

export function SectionGrid({ sections, onSectionSelect }: SectionGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {sections.map((section, index) => (
        <motion.button
          key={section.id}
          type="button"
          className="group"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03, duration: 0.4, ease: "easeOut" }}
          onClick={() => {
            navigator.vibrate?.(10);
            onSectionSelect?.(section.id);
          }}
        >
          <Card
            className={cn(
              "flex h-full min-h-[150px] flex-col items-start justify-between rounded-[24px] border border-white/10 bg-[var(--bg-card)]/90 p-5 text-left shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-transform duration-200 group-hover:-translate-y-1 group-hover:border-white/20"
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[var(--accent-gold)]">
              {section.icon}
            </span>
            <div className="mt-4 space-y-1.5">
              <h4 className="text-base font-semibold text-[var(--text-primary)]">{section.title}</h4>
              <p className="text-sm text-[var(--text-secondary)]">{section.description}</p>
            </div>
          </Card>
        </motion.button>
      ))}
    </div>
  );
}
