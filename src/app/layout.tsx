import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TSK Rewards - Attendance & Rewards",
  description: "Attendance tracking and satoshi rewards management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
