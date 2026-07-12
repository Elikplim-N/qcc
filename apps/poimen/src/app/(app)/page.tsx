import Link from "next/link";
import { count, desc, eq, inArray } from "drizzle-orm";

import { db, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { StatusBadge } from "@qcc/ui/components/status-badge";

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
      <p className="card text-sm text-zinc-400">
        Poimen is the member-focused app for pastoral leaders. Your role uses
        Synago (arrivals) instead.
      </p>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          Welcome, {leader.fullName.split(" ")[0]}
        </h1>
        <p className="text-sm text-zinc-400">
          {scoped.length} bacenta{scoped.length === 1 ? "" : "s"} in your care
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Members" value={total} />
        <Stat label="Committed" value={byStatus.get("committed") ?? 0} tone="text-emerald-400" />
        <Stat label="Unstable" value={byStatus.get("unstable") ?? 0} tone="text-amber-400" />
        <Stat label="Lost" value={byStatus.get("lost") ?? 0} tone="text-red-400" />
      </div>

      <div className="flex gap-3">
        <Link href="/members" className="btn">
          Open directory
        </Link>
        <Link href="/members/new" className="btn-secondary">
          + Add member
        </Link>
      </div>

      <div className="card p-0">
        <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Recently added
        </h2>
        <div className="divide-y divide-zinc-800">
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No members yet.</p>
          ) : (
            recent.map((m) => (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-900"
              >
                <span>
                  {m.firstName} {m.lastName}
                  <span className="ml-2 text-xs text-zinc-500">
                    {m.bacentaId ? bacentaById.get(m.bacentaId)?.name : "Unassigned"}
                  </span>
                </span>
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
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
