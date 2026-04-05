"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirects a Marshall to /attendance at SAST midnight (UTC+2). */
export default function MidnightRedirect() {
  const router = useRouter();

  useEffect(() => {
    const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
    function msUntilSASTMidnight() {
      const now = Date.now();
      const sastNow = now + SAST_OFFSET_MS;
      const d = new Date(sastNow);
      // UTC timestamp of next SAST midnight
      const nextMidnightUTC =
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - SAST_OFFSET_MS;
      return nextMidnightUTC - now;
    }

    const ms = msUntilSASTMidnight();
    const timer = setTimeout(() => {
      router.replace("/attendance");
    }, ms);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
