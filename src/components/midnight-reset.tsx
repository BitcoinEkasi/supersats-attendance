"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirects the Marshall back to /attendance at SAST midnight (UTC+2).
 * Also triggers when the tab becomes visible again after midnight has passed.
 */
export default function MidnightReset() {
  const router = useRouter();

  useEffect(() => {
    function getSASTDateString() {
      return new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().substring(0, 10);
    }

    const mountDate = getSASTDateString();

    // ms remaining until next SAST midnight
    const nowSastMs = Date.now() + 2 * 60 * 60 * 1000;
    const msUntilMidnight = 24 * 60 * 60 * 1000 - (nowSastMs % (24 * 60 * 60 * 1000));

    const timer = setTimeout(() => {
      router.push("/attendance");
    }, msUntilMidnight);

    // Catch the case where the tab was backgrounded across midnight
    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && getSASTDateString() !== mountDate) {
        router.push("/attendance");
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
