import { useEffect, useMemo, useState } from "react";

export function useEnergy(initialLevel: number = 0) {
  const [level, setLevel] = useState(0);
  const [target, setTarget] = useState(Math.max(0, initialLevel));

  useEffect(() => {
    setTarget(Math.max(0, initialLevel));
  }, [initialLevel]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setLevel(target);
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [target]);

  const glowIntensity = useMemo(() => 0.35 + Math.min(level, 100) / 100, [level]);

  return {
    level,
    target,
    setTarget,
    glowIntensity
  };
}
