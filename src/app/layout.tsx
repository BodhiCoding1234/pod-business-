import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drop Lab",
  description: "Market research and product validation for a print-on-demand business.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-zinc-100">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500 text-sm font-bold text-zinc-950">
                DL
              </span>
              Drop Lab
            </Link>
            <span className="text-xs text-zinc-500">Phase 1 · Market Research Engine</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
