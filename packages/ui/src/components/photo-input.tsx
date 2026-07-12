"use client";

import { useRef, useState } from "react";

// Reads a picked image, downsizes it client-side and stores a JPEG data URL
// in a hidden input so plain form actions can submit it.
export function PhotoInput({
  name,
  required = false,
  label = "Photo",
  initial,
}: {
  name: string;
  required?: boolean;
  label?: string;
  initial?: string | null;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(initial ?? null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await downscale(file, 900, 0.72);
      setDataUrl(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <input type="hidden" name={name} value={dataUrl ?? ""} />
      <div className="flex items-center gap-3">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="preview"
            className="h-16 w-16 rounded-lg border border-zinc-700 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-[10px] text-zinc-500">
            none
          </div>
        )}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Processing…" : dataUrl ? "Change photo" : "Add photo"}
        </button>
        {required && !dataUrl ? (
          <span className="text-xs text-amber-400">required</span>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
    </div>
  );
}

function downscale(file: File, maxSide: number, quality: number) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = objectUrl;
  });
}
