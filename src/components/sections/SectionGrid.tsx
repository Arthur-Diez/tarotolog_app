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
}

export function SectionGrid({ sections }: SectionGridProps) {
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
        >
          <Card
            className={cn(
              "glass-panel flex h-full flex-col items-start justify-between rounded-3xl border-none bg-gradient-to-br from-white/80 via-white/60 to-white/40 p-4 text-left shadow-md transition group-hover:-translate-y-1 group-hover:shadow-lg dark:from-white/10 dark:via-white/5 dark:to-white/0",
              index === 0 && "row-span-2"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
                {section.icon}
              </span>
              <h4 className="text-base font-semibold text-foreground">{section.title}</h4>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{section.description}</p>
          </Card>
        </motion.button>
      ))}
    </div>
  );
}
