"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Auto-saving drafts for long forms. Drop inside any <form>: every keystroke
 * is saved to this device (localStorage), so a half-filled form survives
 * accidental closes, refreshes and network drops. The draft is restored the
 * next time the form opens and cleared when the form is submitted.
 * Passwords and file inputs are never saved.
 */
export function FormDraft({ draftKey }: { draftKey: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [restored, setRestored] = useState(false);
  const storageKey = `qcc-draft:${draftKey}`;

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;

    const fields = () =>
      Array.from(form.elements).filter(
        (el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement => {
          if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement))
            return false;
          if (!el.name) return false;
          if (el instanceof HTMLInputElement && (el.type === "password" || el.type === "file" || el.type === "hidden"))
            return false;
          return true;
        },
      );

    // Restore a saved draft — only into fields the user hasn't already filled.
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, string | boolean>;
        let any = false;
        for (const el of fields()) {
          const v = data[el.name];
          if (v === undefined) continue;
          if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
            el.checked = Boolean(v);
            any = true;
          } else if (!el.value && typeof v === "string" && v) {
            el.value = v;
            any = true;
          }
        }
        if (any) setRestored(true);
      }
    } catch {
      // Corrupt draft — ignore.
    }

    let t: ReturnType<typeof setTimeout>;
    const save = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const data: Record<string, string | boolean> = {};
        for (const el of fields()) {
          if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
            data[el.name] = el.checked;
          } else if (el.value) {
            data[el.name] = el.value;
          }
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
          // Storage full/unavailable — drafts are best-effort.
        }
      }, 400);
    };
    const clear = () => {
      clearTimeout(t);
      localStorage.removeItem(storageKey);
      setRestored(false);
    };

    form.addEventListener("input", save);
    form.addEventListener("change", save);
    form.addEventListener("submit", clear);
    return () => {
      clearTimeout(t);
      form.removeEventListener("input", save);
      form.removeEventListener("change", save);
      form.removeEventListener("submit", clear);
    };
  }, [storageKey]);

  if (!restored) return <span ref={ref} className="hidden" />;
  return (
    <span ref={ref} className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
      <span>Draft restored — your earlier unsaved entries were kept.</span>
      <button
        type="button"
        className="shrink-0 font-semibold underline"
        onClick={() => {
          localStorage.removeItem(storageKey);
          const form = ref.current?.closest("form");
          form?.reset();
          setRestored(false);
        }}
      >
        Discard
      </button>
    </span>
  );
}
