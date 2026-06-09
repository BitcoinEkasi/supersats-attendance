import type { Metadata } from "next";
import InstallBanner from "./install-banner";

export const metadata: Metadata = {
  title: "TSK Marshal",
  manifest: "/marshal-manifest.json",
};

export default function MarshalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `if('serviceWorker' in navigator)navigator.serviceWorker.register('/marshal-sw.js',{scope:'/marshal'}).catch(function(){});` }} />
      {children}
      <InstallBanner />
    </>
  );
}
