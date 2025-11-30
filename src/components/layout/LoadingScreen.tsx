import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-6 text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
        className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[var(--bg-card)] shadow-[0_25px_50px_rgba(0,0,0,0.6)]"
      >
        <motion.span
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
          className="h-14 w-14 rounded-full bg-energy-gradient opacity-80"
        />
        <motion.span
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="absolute inset-2 rounded-full border border-white/20"
        />
      </motion.div>
      <p className="mt-6 text-sm text-[var(--text-secondary)]">Загружаем данные Таротолога…</p>
    </div>
  );
}
