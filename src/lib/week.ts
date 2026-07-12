// Service-week helpers. The service week is identified by its Sunday date
// (the upcoming Sunday, inclusive of today if today is Sunday).

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function serviceWeekOf(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const daysUntilSunday = (7 - day) % 7;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  return toIsoDate(d);
}

export function lastNSundays(n: number, now: Date = new Date()): string[] {
  const upcoming = new Date(`${serviceWeekOf(now)}T00:00:00Z`);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(upcoming);
    d.setUTCDate(d.getUTCDate() - 7 * i);
    out.push(toIsoDate(d));
  }
  return out;
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(`${iso}T00:00:00Z`) : iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cediFromPesewas(p: number): string {
  return `GH₵ ${(p / 100).toFixed(2)}`;
}
