import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  name: string;
  username?: string;
  energy: number;
  className?: string;
}

export function Header({ name, username, energy, className }: HeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#7053f4]/80 via-[#a855f7]/70 to-[#ec4899]/70 blur-md" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#7053f4] via-[#a855f7] to-[#ec4899] text-lg font-semibold text-white shadow-glow">
            {name.slice(0, 1)}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">{name}</p>
          {username ? <p className="text-sm text-muted-foreground">@{username}</p> : null}
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Энергия: {energy}%</p>
        </div>
      </div>
      <Button variant="outline" className="gap-2 whitespace-nowrap border-white/30 bg-white/5 px-4 text-sm font-semibold text-secondary hover:bg-white/10">
        <Wallet className="h-4 w-4" />
        Пополнить ⚡
      </Button>
    </div>
  );
}
