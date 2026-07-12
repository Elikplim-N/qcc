import Link from "next/link";
import { count, desc, eq, inArray } from "drizzle-orm";

import { db, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { StatusBadge } from "@qcc/ui/components/status-badge";

const UsersIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HeartIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const AlertTriangleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const XCircleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export default async function PoimenDashboard() {
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const bacentaById = new Map(scoped.map((b) => [b.id, b]));

  const pastoral = [
    "chief_admin",
    "council_leader",
    "governor",
    "bacenta_leader",
  ].includes(leader.role);

  if (!pastoral) {
    return (
      <div className="card text-sm text-zinc-400 p-6 flex flex-col items-center justify-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="font-semibold text-zinc-300">Access Restricted</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Poimen is the member-focused app for pastoral leaders. Your role uses
          Synago (arrivals) instead.
        </p>
      </div>
    );
  }

  const scopeFilter =
    leader.role === "chief_admin" ? undefined : inArray(members.bacentaId, ids);

  const [rows, recent] = await Promise.all([
    db
      .select({ status: members.status, n: count() })
      .from(members)
      .where(scopeFilter)
      .groupBy(members.status),
    db
      .select()
      .from(members)
      .where(scopeFilter)
      .orderBy(desc(members.createdAt))
      .limit(8),
  ]);

  const byStatus = new Map(rows.map((r) => [r.status, r.n]));
  const total = rows.reduce((s, r) => s + r.n, 0);

  return (
    <div className="space-y-6 animate-[slide-up_0.2s_ease-out]">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-indigo-950/20 via-zinc-900/60 to-zinc-900/30 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">
              Welcome back, {leader.fullName.split(" ")[0]}
            </h1>
            <p className="text-sm text-zinc-400 font-medium">
              Managing members and spiritual paths.
            </p>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-950/50 px-3 py-1.5 text-xs font-semibold text-indigo-300 border border-indigo-900/30 md:mt-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Scope: {scoped.length} {scoped.length === 1 ? "bacenta" : "bacentas"}
          </div>
        </div>
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Members"
          value={total}
          icon={UsersIcon}
          borderColor="border-t-indigo-500"
        />
        <Stat
          label="Committed"
          value={byStatus.get("committed") ?? 0}
          tone="text-emerald-400"
          icon={HeartIcon}
          borderColor="border-t-emerald-500"
        />
        <Stat
          label="Unstable"
          value={byStatus.get("unstable") ?? 0}
          tone="text-amber-400"
          icon={AlertTriangleIcon}
          borderColor="border-t-amber-500"
        />
        <Stat
          label="Lost"
          value={byStatus.get("lost") ?? 0}
          tone="text-red-400"
          icon={XCircleIcon}
          borderColor="border-t-red-500"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/members" className="btn min-w-[130px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Open directory
        </Link>
        <Link href="/members/new" className="btn-secondary min-w-[130px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add member
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <h2 className="border-b border-zinc-800/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          Recently added members
        </h2>
        <div className="divide-y divide-zinc-800/60">
          {recent.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="font-semibold text-zinc-400">No members found</p>
              <p className="text-xs text-zinc-500 mt-0.5">Click "Add member" above to record one.</p>
            </div>
          ) : (
            recent.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-zinc-900/60 hover:text-white"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-zinc-200">
                    {m.firstName} {m.lastName}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {m.bacentaId ? bacentaById.get(m.bacentaId)?.name : "Unassigned"}
                  </span>
                </div>
                <StatusBadge value={m.status} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  borderColor,
}: {
  label: string;
  value: number;
  tone?: string;
  icon?: React.ReactNode;
  borderColor?: string;
}) {
  return (
    <div className={`card border-t-2 ${borderColor ?? "border-t-zinc-800"} hover:border-zinc-700 hover:bg-zinc-900/40 cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">{label}</div>
        {icon && <div className="text-zinc-400 bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-800/50">{icon}</div>}
      </div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${tone ?? "text-zinc-100"}`}>{value}</div>
    </div>
  );
}
