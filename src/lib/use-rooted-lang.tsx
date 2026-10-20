"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./invite-i18n";

export const LANG_STORAGE_KEY = "rooted-lang";
const LANG_EVENT = "rooted-lang-change";

function read(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) === "af" ? "af" : "en";
  } catch {
    return "en";
  }
}

/**
 * The same language choice the invite form remembers, so a family that reads
 * Afrikaans sees the new relationship controls in Afrikaans too. The choice
 * lives in localStorage under `rooted-lang`, exactly as before.
 */
export function useRootedLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    setLang(read());
    const onChange = () => setLang(read());
    window.addEventListener("storage", onChange);
    window.addEventListener(LANG_EVENT, onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener(LANG_EVENT, onChange);
    };
  }, []);

  const choose = useCallback((next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Private browsing: the labels still switch for this visit.
    }
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  return [lang, choose];
}

/** A small, finger-sized EN / AF switch. */
export function LanguageToggle({
  lang,
  onChange,
  className = "",
}: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white ${className}`}
      role="group"
      aria-label="Language"
    >
      {(
        [
          ["en", "EN"],
          ["af", "AF"],
        ] as [Lang, string][]
      ).map(([code, label]) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          aria-pressed={lang === code}
          className={`min-h-9 min-w-10 px-2 text-xs font-semibold ${
            lang === code
              ? "bg-slate-900 text-white"
              : "text-slate-500 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </span>
  );
}
