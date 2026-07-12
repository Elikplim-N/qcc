import Link from "next/link";

// lfc-style premium member card: contact-list row on mobile, glassy card on
// desktop. Server-rendered — hover/press effects are pure CSS.

const STATUS_STYLES: Record<string, string> = {
  committed: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  unstable: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  lost: "text-red-400 bg-red-400/10 border-red-400/20",
};

export type MemberCardData = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  photoUrl?: string | null;
  status?: string | null;
  subtitle?: string | null; // bacenta name, role, etc.
};

function Avatar({
  m,
  className,
}: {
  m: MemberCardData;
  className: string;
}) {
  return m.photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={m.photoUrl}
      alt=""
      className={`${className} rounded-full border border-white/10 object-cover`}
      loading="lazy"
    />
  ) : (
    <div
      className={`${className} flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-zinc-400`}
    >
      {m.firstName[0]}
      {m.lastName[0]}
    </div>
  );
}

export function MemberCard({ member: m, href }: { member: MemberCardData; href: string }) {
  const status = m.status ? (
    <span
      className={`badge border text-[9px] font-bold uppercase ${STATUS_STYLES[m.status] ?? "border-white/10 bg-white/5 text-zinc-400"}`}
    >
      {m.status}
    </span>
  ) : null;

  return (
    <Link href={href} className="group block">
      {/* mobile: contact-list row */}
      <div className="flex items-center gap-3 border-b border-white/5 px-1 py-2.5 transition-colors active:bg-white/5 sm:hidden">
        <Avatar m={m} className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight text-white">
            {m.firstName} {m.lastName}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {m.subtitle || m.phoneNumber}
          </p>
        </div>
        {status}
      </div>

      {/* desktop: premium card */}
      <div className="relative hidden overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 sm:block">
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md bg-white/5 opacity-0 transition-all group-hover:bg-indigo-500/20 group-hover:opacity-100">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-indigo-400">
            <path d="M7 17L17 7M17 7H8M17 7v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex items-center gap-3">
          <Avatar m={m} className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {m.firstName} {m.lastName}
            </p>
            <p className="truncate text-[10px] text-zinc-500">{m.subtitle || "Member"}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {status}
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="text-indigo-400">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {m.phoneNumber}
          </span>
        </div>
      </div>
    </Link>
  );
}
