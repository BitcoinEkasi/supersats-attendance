"use client";

import { useState } from "react";

// Visibility is CSS-driven (see .rotate-hint-banner in globals.css) — narrow
// portrait viewports only, so no JS orientation detection / hydration risk.
export default function RotateHint() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="rotate-hint-banner mb-4 flex items-center justify-between gap-3 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
      <span>📱 Rotate your device to landscape for the best view of the chart.</span>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="px-1 font-bold text-orange-800">×</button>
    </div>
  );
}
