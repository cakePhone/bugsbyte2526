"use client";

import { useEffect } from "react";

export default function usePollingTask(
  task: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      Promise.resolve(task()).catch(() => undefined);
    };

    run();
    const timer = setInterval(run, intervalMs);
    return () => clearInterval(timer);
  }, [enabled, intervalMs, task]);
}
