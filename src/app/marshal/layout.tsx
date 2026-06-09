import type { Metadata } from "next";
import Script from "next/script";
import InstallBanner from "./install-banner";

export const metadata: Metadata = {
  title: "TSK Marshal",
  manifest: "/marshal-manifest.json",
};

export default function MarshalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script id="marshal-sw" strategy="afterInteractive">{`
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/marshal-sw.js', { scope: '/marshal' }).catch(function(){});
        }
      `}</Script>
      {children}
      <InstallBanner />
    </>
  );
}
