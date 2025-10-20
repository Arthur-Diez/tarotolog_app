import { motion } from "framer-motion";

import type { TabRoute } from "@/app/routes";
import { cn } from "@/lib/utils";

export interface TabBarProps {
  routes: TabRoute[];
  activeRouteId: TabRoute["id"];
  onRouteChange: (id: TabRoute["id"]) => void;
}

export function TabBar({ routes, activeRouteId, onRouteChange }: TabBarProps) {
  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4">
      <div className="pointer-events-auto glass-panel flex w-full max-w-[420px] items-center justify-between gap-1 rounded-full px-3 py-2 shadow-2xl shadow-secondary/20">
        {routes.map((route) => {
          const Icon = route.icon;
          const isActive = route.id === activeRouteId;

          return (
            <button
              key={route.id}
              type="button"
              onClick={() => onRouteChange(route.id)}
              className={cn(
                "relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-full px-2 py-2 text-xs transition",
                isActive ? "text-secondary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute inset-0 rounded-full bg-secondary/15"
                  transition={{ type: "spring", stiffness: 220, damping: 20 }}
                />
              )}
              <Icon className="relative z-10 h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="relative z-10 hidden text-sm font-medium sm:inline">
                {route.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
