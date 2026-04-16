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
    <nav className="tabbar-nav pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pt-2">
      <div className="tabbar-wrap pointer-events-auto relative flex w-full justify-center">
        <div className="tabbar-glass flex w-full max-w-[430px] items-stretch overflow-hidden rounded-[28px] px-1.5 py-1.5">
          {routes.map((route) => {
            const Icon = route.icon;
            const isHome = route.path === "/";
            return (
              <NavLink key={route.id} to={route.path} end={isHome} className="tabbar-link flex min-w-0 flex-1 justify-center">
                {({ isActive }) => {
                  const stroke = route.isPrimary ? 1.8 : 1.5;
                  return (
                    <div className={cn("tabbar-item relative flex w-full flex-col items-center rounded-[22px] px-1 py-1.5", isActive && "is-active")}>
                      {isActive ? (
                        <motion.span
                          layoutId="tab-indicator"
                          className="tabbar-item-indicator absolute inset-0 rounded-[22px]"
                          transition={{ type: "spring", stiffness: 260, damping: 22 }}
                        />
                      ) : null}
                      <Icon
                        className={cn(
                          "tabbar-icon relative z-10 h-[18px] w-[18px] transition-colors",
                          isActive && "is-active"
                        )}
                        strokeWidth={stroke}
                      />
                      <span
                        className={cn(
                          "tabbar-label relative z-10 text-[11px] font-medium",
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
