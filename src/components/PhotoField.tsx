"use client";

import { useRef, useState } from "react";
import { stringsFor, type Lang } from "@/lib/invite-i18n";

interface Props {
  /** Current photo URL, or "" for none. */
  value: string;
  onChange: (url: string) => void;
  /** Shown inside the empty circle — usually the person's initials. */
  placeholder?: string;
  /** The invite form can be in Afrikaans; the admin screens are English. */
  lang?: Lang;
}

/** Longest edge of the stored image. Plenty for a 40px avatar on a retina screen. */
const MAX_EDGE = 640;

/**
 * Shrinks a photo in the browser before it's uploaded.
 *
 * Phone photos are 3–8 MB, and a relative on patchy mobile data shouldn't have
 * to wait minutes to send one. Re-drawing it onto a canvas at 640px and
 * re-encoding as JPEG takes it to roughly 60–100 KB, which uploads in a second
 * or two and still looks sharp at the size we show it.
 */
function shrink(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))),
        "image/jpeg",
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't an image we can read"));
    };

    img.src = url;
  });
}

export default function PhotoField({ value, onChange, placeholder, lang = "en" }: Props) {
  const t = stringsFor(lang);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const small = await shrink(file);
      const body = new FormData();
      body.append("file", new File([small], "photo.jpg", { type: "image/jpeg" }));

      const res = await fetch("/api/upload", { method: "POST", body });

      // A failing upload used to show one vague line, which told the user
      // nothing and told us nothing either. Show whatever the server said.
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      try {
        data = JSON.parse(text) as { url?: string; error?: string };
      } catch {
        throw new Error(`${t.photoFailed} (${res.status})`);
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error ? `${data.error} (${res.status})` : `${t.photoFailed} (${res.status})`);
      }

      onChange(data.url);
    } catch (err) {
      console.error("Photo upload failed:", err);
      setError(err instanceof Error ? err.message : t.photoFailed);
    } finally {
      setBusy(false);
      // Let the same file be chosen again after a failure.
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-400">
          {value ? (
            // A plain img: these are arbitrary user URLs, not build-time assets.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{placeholder || "🙂"}</span>
          )}
        </div>

        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-50"
          >
            {busy ? t.photoUploading : value ? t.photoReplace : t.photoAdd}
          </button>

          {value && !busy && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[11px] text-slate-400 hover:text-rose-500"
            >
              {t.photoRemove}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : (
        <p className="mt-1 text-[11px] text-slate-400">{t.photoHint}</p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
