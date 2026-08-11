/**
 * Collapsible section card — summarizes a heavy block into one tappable
 * header row (title + count badge) that expands on demand, so long pages
 * read as a short list of summaries instead of everything laid out flat.
 * Pure <details>/<summary>: works server-side, no JS needed.
 */
export function Collapse({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-xl border border-zinc-800 bg-zinc-900/60"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-zinc-200">{title}</span>
        <span className="flex items-center gap-2">
          {badge !== undefined && (
            <span className="badge bg-zinc-800 text-zinc-300 border border-zinc-700">
              {badge}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-500 transition-transform group-open:rotate-180"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-zinc-800">{children}</div>
    </details>
  );
}
