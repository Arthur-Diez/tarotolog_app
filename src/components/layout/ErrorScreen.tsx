import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorScreenProps {
  message: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorScreen({ message, description, onRetry, className }: ErrorScreenProps) {
  return (
    <div className={cn("mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-6 text-center", className)}>
      <div className="glass-panel flex flex-col items-center gap-4 rounded-3xl px-8 py-10 shadow-2xl">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">{message}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {onRetry ? (
          <Button onClick={onRetry} variant="default" className="px-6">
            Попробовать снова
          </Button>
        ) : null}
      </div>
    </div>
  );
}
