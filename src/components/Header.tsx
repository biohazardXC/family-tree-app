"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Tree" },
  { href: "/people", label: "People" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <span aria-hidden>🌳</span> Rooted
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href
                  ? "rounded-md bg-emerald-100 px-3 py-1.5 font-medium text-emerald-800"
                  : "rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto hidden text-xs text-slate-400 sm:block">
          v0.1 — early days 🌱
        </span>
      </div>
    </header>
  );
}
