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
        <div className="glass-panel flex w-full items-end justify-between gap-1 rounded-full px-3 py-3 shadow-2xl shadow-secondary/25">
          {routes.map((route) => {
            const Icon = route.icon;
            const isHome = route.path === "/";
            return (
              <NavLink
                key={route.id}
                to={route.path}
                end={isHome}
                className="flex flex-1 items-end justify-center"
              >
                {({ isActive }) => {
                  if (route.isPrimary) {
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <motion.div
                          layout="position"
                          className={cn(
                            "flex h-14 w-14 items-center justify-center rounded-full border border-secondary/40 bg-gradient-to-br from-secondary via-secondary/90 to-foreground/70 text-white shadow-[0_0_18px_rgba(250,204,21,0.45)] transition-transform duration-200",
                            isActive ? "scale-110" : "scale-100"
                          )}
                        >
                          <Icon className="h-6 w-6 text-white" strokeWidth={2.6} />
                        </motion.div>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                          {route.label}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      className={cn(
                        "relative flex flex-col items-center gap-1 rounded-full px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide transition-colors",
                        isActive ? "text-secondary" : "text-muted-foreground"
                      )}
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="tab-indicator"
                          className="absolute inset-0 rounded-full bg-secondary/15"
                          transition={{ type: "spring", stiffness: 220, damping: 20 }}
                        />
                      ) : null}
                      <Icon className="relative z-10 h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                      <span className="relative z-10 text-xs capitalize">{route.label}</span>
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
