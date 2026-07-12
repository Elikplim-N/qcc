const STYLES: Record<string, string> = {
  submitted: "bg-amber-950 text-amber-300 border border-amber-900/30",
  approved: "bg-emerald-950 text-emerald-300 border border-emerald-900/30",
  rejected: "bg-red-950 text-red-300 border border-red-900/30",
  committed: "bg-emerald-950 text-emerald-300 border border-emerald-900/30",
  unstable: "bg-amber-950 text-amber-300 border border-amber-900/30",
  lost: "bg-red-950 text-red-300 border border-red-900/30",
  area1: "bg-sky-950 text-sky-300 border border-sky-900/30",
  area2: "bg-violet-950 text-violet-300 border border-violet-900/30",
};

const DOT_COLORS: Record<string, string> = {
  submitted: "bg-amber-400",
  approved: "bg-emerald-400",
  rejected: "bg-red-400",
  committed: "bg-emerald-400",
  unstable: "bg-amber-400",
  lost: "bg-red-400",
  area1: "bg-sky-400",
  area2: "bg-violet-400",
};

export function StatusBadge({ value }: { value: string }) {
  const style = STYLES[value] ?? "bg-zinc-800 text-zinc-300 border border-zinc-700/30";
  const dot = DOT_COLORS[value] ?? "bg-zinc-400";
  const label =
    value === "area1" ? "Area 1" : value === "area2" ? "Area 2" : value;
  return (
    <span className={`badge ${style}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
