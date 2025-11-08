import { AnimatePresence, motion } from "framer-motion";
import { PropsWithChildren, useId } from "react";

interface ExpanderProps extends PropsWithChildren {
  isOpen: boolean;
  ariaId?: string;
}

export function Expander({ isOpen, ariaId, children }: ExpanderProps) {
  const generatedId = useId();
  const contentId = ariaId ?? generatedId;

  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          key="expander"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          aria-live="polite"
        >
          <div id={contentId} className="pt-3 text-sm text-muted-foreground">
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
