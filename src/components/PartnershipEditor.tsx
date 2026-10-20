"use client";

import { useState } from "react";
import {
  PARTNERSHIP_STATUS_OPTIONS,
  PARTNERSHIP_STRINGS,
  partnershipStatusLabel,
  partnershipSymbol,
} from "@/lib/partnership-status";
import { useRootedLang, LanguageToggle } from "@/lib/use-rooted-lang";
import type { PartnershipDTO } from "@/lib/types";

interface Props {
  partnership: PartnershipDTO;
  aName: string;
  bName: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

/**
 * The little panel that opens when the ⚭ / ⚯ / ⚮ / ⚰ on a couple's line is
 * tapped. It can change the status and remove the couple link — nothing else.
 */
export default function PartnershipEditor({ partnership, aName, bName, onClose, onSaved }: Props) {
  const [lang, chooseLang] = useRootedLang();
  const t = PARTNERSHIP_STRINGS[lang];
  const [status, setStatus] = useState(partnership.status ?? "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!status) {
      setError(t.chooseError);
      return;
    }
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/partnerships/${partnership.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      await onSaved();
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(t.removeConfirm(aName, bName))) return;
    setRemoving(true);
    setError(null);
    try {
      const res = await fetch(`/api/partnerships/${partnership.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove failed");
      await onSaved();
      onClose();
    } catch {
      setError(t.removeError);
    } finally {
      setRemoving(false);
    }
  };

  const busy = saving || removing;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="partnership-editor-title"
        data-testid="partnership-editor"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="partnership-editor-title" className="text-base font-semibold text-slate-900">
              {t.statusTitle}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {aName} <span className="font-semibold text-rose-600">{partnershipSymbol(status)}</span> {bName}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle lang={lang} onChange={chooseLang} />
            <button
              type="button"
              onClick={onClose}
              aria-label={t.close}
              data-testid="close-partnership-editor"
              className="flex h-11 w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">{t.statusHint}</p>

        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={t.statusTitle}>
          {PARTNERSHIP_STATUS_OPTIONS.map((option) => {
            const selected = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                data-testid={`status-${option.value}`}
                aria-pressed={selected}
                onClick={() => {
                  setStatus(option.value);
                  setSaved(false);
                  setError(null);
                }}
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium ${
                  selected
                    ? "border-rose-400 bg-rose-50 text-rose-800 ring-2 ring-rose-100"
                    : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50/50"
                }`}
              >
                <span className="w-5 shrink-0 text-center text-lg leading-none">{option.symbol}</span>
                <span>{option[lang]}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          {t.onlyStatus}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          {t.current}: <span className="font-medium text-slate-600">{partnershipStatusLabel(partnership.status, lang)}</span>
        </p>

        {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
        {saved && !error && (
          <p className="mt-2 text-xs font-medium text-emerald-700" data-testid="partnership-saved">
            ✓ {t.saved}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            data-testid="remove-partnership"
            className="min-h-11 rounded-full px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            {removing ? t.removing : t.remove}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || !status}
            data-testid="save-partnership-status"
            className="min-h-11 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>
    </div>
  );
}
