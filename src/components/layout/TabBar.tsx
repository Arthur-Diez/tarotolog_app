import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

import type { TabRoute } from "@/app/routes";
import { cn } from "@/lib/utils";

export interface TabBarProps {
  routes: TabRoute[];
}

export function TabBar({ routes }: TabBarProps) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
      <div className="pointer-events-auto relative flex w-full max-w-[420px] justify-center">
        <div className="flex w-full items-center justify-between gap-1 rounded-[32px] border border-white/10 bg-[var(--bg-card)]/85 px-3 py-3 shadow-[0_30px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          {routes.map((route) => {
            const Icon = route.icon;
            const isHome = route.path === "/";
            return (
              <NavLink key={route.id} to={route.path} end={isHome} className="flex flex-1 justify-center">
                {({ isActive }) => {
                  const baseIconClass = cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-[var(--accent-pink)]" : "text-white/45"
                  );
                  const baseLabelClass = cn(
                    "text-[10px] uppercase tracking-[0.3em]",
                    isActive ? "text-white" : "text-white/45"
                  );
                  const stroke = route.isPrimary ? 1.8 : 1.5;
                  return (
                    <div className="relative flex flex-col items-center gap-1 rounded-2xl px-2 py-1.5">
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
