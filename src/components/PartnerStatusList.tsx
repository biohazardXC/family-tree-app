"use client";

import { useEffect, useState } from "react";
import {
  PARTNERSHIP_STATUS_OPTIONS,
  PARTNERSHIP_STRINGS,
  partnershipStatusLabel,
} from "@/lib/partnership-status";
import { LanguageToggle, useRootedLang } from "@/lib/use-rooted-lang";
import type { PersonRelations } from "@/lib/relations";

interface Props {
  partners: PersonRelations["partners"];
  onSaved: () => Promise<void> | void;
}

/** One row per partner, with the status editable right there. */
function PartnerRow({
  partner,
  onSaved,
}: {
  partner: PersonRelations["partners"][number];
  onSaved: () => Promise<void> | void;
}) {
  const [lang] = useRootedLang();
  const t = PARTNERSHIP_STRINGS[lang];
  const [status, setStatus] = useState(partner.status ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setStatus(partner.status ?? "");
  }, [partner.status]);

  const save = async () => {
    if (!status) {
      setError(true);
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(false);
    try {
      const res = await fetch(`/api/partnerships/${partner.partnershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      await onSaved();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="space-y-1.5" data-testid={`partner-row-${partner.partnershipId}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-slate-700">{partner.name}</span>
        <span className="shrink-0 text-[11px] text-slate-400">
          {partnershipStatusLabel(partner.status, lang)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSaved(false);
            setError(false);
          }}
          aria-label={`${t.statusTitle}: ${partner.name}`}
          data-testid={`partner-status-${partner.partnershipId}`}
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="" disabled>
            {t.choose}
          </option>
          {PARTNERSHIP_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.symbol} {option[lang]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving || !status}
          data-testid={`save-partner-status-${partner.partnershipId}`}
          className="min-h-11 shrink-0 rounded-full bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? t.saving : saved ? `✓ ${t.saved}` : t.save}
        </button>
      </div>
      {error && <p className="text-[11px] font-medium text-rose-600">{t.saveError}</p>}
    </li>
  );
}

export default function PartnerStatusList({ partners, onSaved }: Props) {
  const [lang, chooseLang] = useRootedLang();
  const t = PARTNERSHIP_STRINGS[lang];

  return (
    <div className="col-span-2 rounded-xl border border-rose-100 bg-rose-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-500">
          {t.partners}
        </h3>
        <LanguageToggle lang={lang} onChange={chooseLang} />
      </div>
      {partners.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">{t.noPartners}</p>
      ) : (
        <ul className="mt-2 space-y-3">
          {partners.map((partner) => (
            <PartnerRow key={partner.partnershipId} partner={partner} onSaved={onSaved} />
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-slate-500">{t.onlyStatus}</p>
    </div>
  );
}
