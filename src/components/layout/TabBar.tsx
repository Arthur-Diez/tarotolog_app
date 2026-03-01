import { motion } from "framer-motion";
import { NavLink } from "react-router-dom";

import type { TabRoute } from "@/app/routes";
import { cn } from "@/lib/utils";
import "./TabBar.css";

export interface TabBarProps {
  routes: TabRoute[];
}

export function TabBar({ routes }: TabBarProps) {
  return (
    <nav className="tabbar-nav pointer-events-none fixed inset-x-0 bottom-0 flex justify-center px-3 pt-2 sm:px-4">
      <div className="tabbar-wrap pointer-events-auto relative flex w-full justify-center">
        <div className="tabbar-glass flex w-full max-w-[460px] items-stretch overflow-hidden rounded-[30px] px-1.5 py-1.5 sm:px-2 sm:py-2">
          {routes.map((route) => {
            const Icon = route.icon;
            const isHome = route.path === "/";
            return (
              <NavLink key={route.id} to={route.path} end={isHome} className="tabbar-link flex min-w-0 flex-1 justify-center">
                {({ isActive }) => {
                  const stroke = route.isPrimary ? 1.8 : 1.5;
                  return (
                    <div className={cn("tabbar-item relative flex w-full flex-col items-center gap-1 rounded-2xl px-1.5 py-1 sm:px-2", isActive && "is-active")}>
                      {isActive ? (
                        <motion.span
                          layoutId="tab-indicator"
                          className="tabbar-item-indicator absolute inset-0 rounded-2xl"
                          transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "tabbar-icon relative z-10 h-5 w-5 transition-colors sm:h-5 sm:w-5",
                          isActive && "is-active"
                        )}
                        strokeWidth={stroke}
                      />
                      <span
                        className={cn(
                          "tabbar-label relative z-10 text-[10px] font-semibold uppercase tracking-[0.2em]",
                          isActive && "is-active"
                        )}
                      >
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
