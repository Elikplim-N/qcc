import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { db, bacentas, councils, governorships, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canCreateCouncil } from "@qcc/core/permissions";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import {
  createBacentaAction,
  createCouncilAction,
  createGovernorshipAction,
} from "./actions";

export default async function ManagePage() {
  const leader = await requireLeader();
  if (!["chief_admin", "council_leader", "governor"].includes(leader.role)) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
  }

  const [allCouncils, allGovs, allBacentas, memberCounts] = await Promise.all([
    db.select().from(councils).orderBy(councils.name),
    db.select().from(governorships).orderBy(governorships.name),
    db.select().from(bacentas).orderBy(bacentas.name),
    db
      .select({ bacentaId: members.bacentaId, n: count() })
      .from(members)
      .groupBy(members.bacentaId),
  ]);
  const countByBacenta = new Map(memberCounts.map((r) => [r.bacentaId, r.n]));

  // Scope the tree
  const visibleCouncils = allCouncils.filter((c) =>
    leader.role === "chief_admin"
      ? true
      : leader.role === "council_leader"
        ? c.id === leader.councilId
        : allGovs.some((g) => g.councilId === c.id && g.id === leader.governorshipId),
  );
  const visibleGovs = (councilId: string) =>
    allGovs.filter(
      (g) =>
        g.councilId === councilId &&
        (leader.role !== "governor" || g.id === leader.governorshipId),
    );

  // Creation scopes for the forms
  const creatableCouncils =
    leader.role === "chief_admin"
      ? allCouncils
      : allCouncils.filter((c) => c.id === leader.councilId);
  const creatableGovs =
    leader.role === "chief_admin"
      ? allGovs
      : leader.role === "council_leader"
        ? allGovs.filter((g) => g.councilId === leader.councilId)
        : allGovs.filter((g) => g.id === leader.governorshipId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Manage hierarchy</h1>
        <Link href="/manage/leaders" className="btn-secondary">
          Leaders & roles →
        </Link>
      </div>

      {/* Tree */}
      <div className="space-y-4">
        {visibleCouncils.length === 0 ? (
          <p className="card text-sm text-zinc-500">No councils yet.</p>
        ) : (
          visibleCouncils.map((c) => (
            <div key={c.id} className="card space-y-3">
              <h2 className="font-bold">{c.name}</h2>
              {visibleGovs(c.id).map((g) => (
                <div key={g.id} className="ml-2 rounded-lg border border-zinc-800 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-sm font-semibold">{g.name}</span>
                    <StatusBadge value={g.area} />
                  </div>
                  <div className="ml-2 space-y-1">
                    {allBacentas
                      .filter((b) => b.governorshipId === g.id)
                      .map((b) => (
                        <Link
                          key={b.id}
                          href={`/manage/bacentas/${b.id}`}
                          className="flex items-center justify-between rounded border border-zinc-800/70 px-3 py-1.5 text-sm hover:bg-zinc-900"
                        >
                          <span className="flex items-center gap-2">
                            {b.name} <StatusBadge value={b.area} />
                          </span>
                          <span className="text-xs text-zinc-500">
                            {countByBacenta.get(b.id) ?? 0} members · edit →
                          </span>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Creation forms */}
      <div className="grid gap-4 lg:grid-cols-3">
        {canCreateCouncil(leader) ? (
          <form action={createCouncilAction} className="card space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              New council
            </h3>
            <input name="name" placeholder="Council name" className="input" required />
            <button className="btn w-full">Create council</button>
          </form>
        ) : null}

        {["chief_admin", "council_leader"].includes(leader.role) ? (
          <form action={createGovernorshipAction} className="card space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              New governorship
            </h3>
            <select name="councilId" className="input" required defaultValue="">
              <option value="" disabled>
                Council
              </option>
              {creatableCouncils.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="name" placeholder="Governorship name" className="input" required />
            <select name="area" className="input" defaultValue="area1">
              <option value="area1">Area 1 (in person)</option>
              <option value="area2">Area 2 (bussed)</option>
            </select>
            <button className="btn w-full">Create governorship</button>
          </form>
        ) : null}

        <form action={createBacentaAction} className="card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            New bacenta
          </h3>
          <select name="governorshipId" className="input" required defaultValue="">
            <option value="" disabled>
              Governorship
            </option>
            {creatableGovs.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <input name="name" placeholder="Bacenta name" className="input" required />
          <select name="area" className="input" defaultValue="area1">
            <option value="area1">Area 1 (in person)</option>
            <option value="area2">Area 2 (bussed)</option>
          </select>
          <button className="btn w-full">Create bacenta</button>
        </form>
      </div>
    </div>
  );
}
