import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center bg-background px-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-secondary/40"
      >
        <motion.span
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          className="h-9 w-9 rounded-full bg-secondary/70"
        />
      </motion.div>
      <p className="mt-6 text-sm text-muted-foreground">Загружаем данные Таротолога…</p>
    </div>
  );
}
