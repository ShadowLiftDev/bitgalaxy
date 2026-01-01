import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "BitGalaxy",
  description: "Gamified XP engine for The Neon Ecosystem.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-sky-50 antialiased">
        {/* Neon background */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          {/* Radial glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.20),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(236,72,153,0.22),_transparent_65%)]" />
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:80px_80px]" />
        </div>

        <main className="min-h-screen mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}