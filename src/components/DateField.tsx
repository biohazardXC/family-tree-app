"use client";

import { useEffect, useState } from "react";
import {
  dateProblem,
  dateValueFrom,
  emptyDateParts,
  parseDateValue,
  type DateParts,
} from "@/lib/dates";

interface Props {
  label: string;
  hint?: string;
  /** Stored value: "1936", "1936-03" or "1936-03-12". */
  value: string;
  onChange: (value: string) => void;
}

const box =
  "rounded-lg border border-slate-200 px-2 py-2 text-center text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

/**
 * Day / month / year in three small boxes, in that order.
 *
 * A plain date picker is no good here: it demands an exact day, and most
 * people genuinely don't know the day their grandmother was born. The year
 * on its own is enough — the day and month are a bonus.
 */
export default function DateField({ label, hint, value, onChange }: Props) {
  const [parts, setParts] = useState<DateParts>(() => parseDateValue(value));
  const [touched, setTouched] = useState(false);

  // Keep in step when the form is reset or loaded from elsewhere.
  useEffect(() => {
    const incoming = parseDateValue(value);
    setParts((cur) => (dateValueFrom(cur) === value ? cur : incoming));
  }, [value]);

  const update = (key: keyof DateParts, raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, key === "year" ? 4 : 2);
    const next = { ...parts, [key]: digits };
    setParts(next);
    onChange(dateValueFrom(next));
  };

  const problem = touched ? dateProblem(parts) : null;
  const yearOnly = Boolean(parts.year) && !parts.month && !parts.day;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-[11px] text-slate-400">dd / mm / yyyy</span>
      </div>

      <div className="mt-1 flex items-center gap-2" onBlur={() => setTouched(true)}>
        <input
          className={`${box} w-14`}
          inputMode="numeric"
          placeholder="dd"
          aria-label={`${label} — day`}
          value={parts.day}
          onChange={(e) => update("day", e.target.value)}
        />
        <span className="text-slate-300">/</span>
        <input
          className={`${box} w-14`}
          inputMode="numeric"
          placeholder="mm"
          aria-label={`${label} — month`}
          value={parts.month}
          onChange={(e) => update("month", e.target.value)}
        />
        <span className="text-slate-300">/</span>
        <input
          className={`${box} w-20`}
          inputMode="numeric"
          placeholder="yyyy"
          aria-label={`${label} — year`}
          value={parts.year}
          onChange={(e) => update("year", e.target.value)}
        />
        {(parts.day || parts.month || parts.year) && (
          <button
            type="button"
            onClick={() => {
              setParts(emptyDateParts());
              onChange("");
            }}
            className="ml-1 text-xs text-slate-400 hover:text-rose-500"
          >
            Clear
          </button>
        )}
      </div>

      {problem ? (
        <p className="mt-1 text-xs text-rose-600">{problem}</p>
      ) : yearOnly ? (
        <p className="mt-1 text-xs text-slate-400">Just the year is fine.</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}
