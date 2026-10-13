import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leapform",
  description: "Conversational forms: build, publish, collect, export.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-off-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
