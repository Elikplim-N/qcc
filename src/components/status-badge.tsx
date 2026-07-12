const STYLES: Record<string, string> = {
  submitted: "bg-amber-950 text-amber-300 border border-amber-900",
  approved: "bg-emerald-950 text-emerald-300 border border-emerald-900",
  rejected: "bg-red-950 text-red-300 border border-red-900",
  committed: "bg-emerald-950 text-emerald-300 border border-emerald-900",
  unstable: "bg-amber-950 text-amber-300 border border-amber-900",
  lost: "bg-red-950 text-red-300 border border-red-900",
  area1: "bg-sky-950 text-sky-300 border border-sky-900",
  area2: "bg-violet-950 text-violet-300 border border-violet-900",
};

export function StatusBadge({ value }: { value: string }) {
  const label =
    value === "area1" ? "Area 1" : value === "area2" ? "Area 2" : value;
  return (
    <span className={`badge ${STYLES[value] ?? "bg-zinc-800 text-zinc-300"}`}>
      {label}
    </span>
  );
}
