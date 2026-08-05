"use client";

import { useEffect } from "react";

// Best-effort landscape lock — browsers only honor screen.orientation.lock() in a
// standalone/fullscreen context, so this is skipped entirely (no-op, no console
// noise) unless actually running as the installed PWA.
export default function OrientationLock() {
  useEffect(() => {
    if (!window.matchMedia("(display-mode: standalone)").matches) return;
    const orientation = (screen as any).orientation;
    orientation?.lock?.("landscape").catch(() => {});
  }, []);
  return null;
}
