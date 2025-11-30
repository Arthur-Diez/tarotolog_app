import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

import type { TabRoute } from "@/app/routes";
import { cn } from "@/lib/utils";

export interface TabBarProps {
  routes: TabRoute[];
}

export function TabBar({ routes }: TabBarProps) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 flex justify-center px-3 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-2 sm:px-4">
      <div className="pointer-events-auto relative flex w-full justify-center">
        <div className="flex w-full max-w-[460px] items-stretch overflow-hidden rounded-[32px] border border-white/10 bg-[var(--bg-card)]/85 px-1.5 py-1.5 shadow-[0_30px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:px-2 sm:py-2">
          {routes.map((route) => {
            const Icon = route.icon;
            const isHome = route.path === "/";
            return (
              <NavLink key={route.id} to={route.path} end={isHome} className="flex min-w-0 flex-1 justify-center">
                {({ isActive }) => {
                  const baseIconClass = cn(
                    "h-5 w-5 transition-colors sm:h-5 sm:w-5",
                    isActive ? "text-[var(--accent-pink)]" : "text-white/45"
                  );
                  const baseLabelClass = cn(
                    "text-[0.6rem] uppercase tracking-[0.2em] sm:text-[0.65rem]",
                    isActive ? "text-[var(--text-primary)]" : "text-white/45"
                  );
                  const stroke = route.isPrimary ? 1.8 : 1.5;
                  return (
                    <div className="relative flex w-full flex-col items-center gap-1 rounded-2xl px-1.5 py-1 sm:px-2">
                      {isActive ? (
                        <motion.span
                          layoutId="tab-indicator"
                          className="absolute inset-0 rounded-2xl border border-white/10 bg-white/5 shadow-[inset_0_0_12px_rgba(255,255,255,0.2)]"
                          transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        />
                      ) : null}
                      <Icon className={cn("relative z-10", baseIconClass)} strokeWidth={stroke} />
                      <span className={cn("relative z-10 text-[10px] font-semibold", baseLabelClass)}>
                        {route.label}
                      </span>
                    </div>
                  );
                }}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
