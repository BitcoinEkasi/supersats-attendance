"use client";

import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-orange-300 bg-white px-4 py-3 shadow-lg">
      <span className="text-sm text-gray-800">Install this app on your device</span>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setPrompt(null)} className="rounded-lg px-3 py-1.5 text-sm text-gray-500">Later</button>
        <button
          onClick={() => { prompt.prompt(); prompt.userChoice.then(() => setPrompt(null)); }}
          className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white"
        >Install</button>
      </div>
    </div>
  );
}
