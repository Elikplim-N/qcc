import { eq, inArray } from "drizzle-orm";
import Link from "next/link";

import { db, bacentas, councils, governorships, leaders, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { ROLE_LABELS, type Role } from "@qcc/core/permissions";
import { getScopedBacentas } from "@qcc/core/scope";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { promoteLeaderAction, setLeaderActiveAction } from "./actions";

export default async function LeadersManagementPage() {
  const actor = await requireLeader();
  const allowed = ["chief_admin", "council_leader", "governor"].includes(actor.role);
  if (!allowed) {
    return <p className="card text-sm text-zinc-400">Outside your role scope.</p>;
  }

  const scoped = await getScopedBacentas(actor);
  const scopedIds = scoped.map((b) => b.id);

  const [allLeaders, allCouncils, allGovs, scopedMembers] = await Promise.all([
    db
      .select({
        id: leaders.id,
        role: leaders.role,
        username: leaders.username,
        isActive: leaders.isActive,
        bacentaId: leaders.bacentaId,
        governorshipId: leaders.governorshipId,
        councilId: leaders.councilId,
        firstName: members.firstName,
        lastName: members.lastName,
      })
      .from(leaders)
      .innerJoin(members, eq(leaders.memberId, members.id)),
    db.select().from(councils).orderBy(councils.name),
    db.select().from(governorships).orderBy(governorships.name),
    scopedIds.length
      ? db
          .select({
            id: members.id,
            firstName: members.firstName,
            lastName: members.lastName,
            phoneNumber: members.phoneNumber,
          })
          .from(members)
          .where(
            actor.role === "chief_admin"
              ? undefined
              : inArray(members.bacentaId, scopedIds),
          )
          .orderBy(members.firstName)
          .limit(500)
      : Promise.resolve([]),
  ]);

  const roleOptions: Role[] =
    actor.role === "chief_admin"
      ? ["chief_admin", "council_leader", "governor", "bacenta_leader", "arrivals_admin", "arrivals_counter"]
      : actor.role === "council_leader"
        ? ["governor", "bacenta_leader"]
        : ["bacenta_leader"];

  const councilOptions =
    actor.role === "chief_admin"
      ? allCouncils
      : allCouncils.filter((c) => c.id === actor.councilId);
  const govOptions =
    actor.role === "chief_admin"
      ? allGovs
      : actor.role === "council_leader"
        ? allGovs.filter((g) => g.councilId === actor.councilId)
        : allGovs.filter((g) => g.id === actor.governorshipId);

  const bacentaName = new Map(scoped.map((b) => [b.id, b.name]));
  const govName = new Map(allGovs.map((g) => [g.id, g.name]));
  const councilName = new Map(allCouncils.map((c) => [c.id, c.name]));

  const visibleLeaders = allLeaders.filter((l) => {
    if (actor.role === "chief_admin") return true;
    if (l.bacentaId) return scopedIds.includes(l.bacentaId);
    if (l.governorshipId) return govOptions.some((g) => g.id === l.governorshipId);
    if (l.councilId) return l.councilId === actor.councilId;
    return false;
  });

  return (
    <div className="max-w-4xl space-y-6 animate-[slide-up_0.2s_ease-out]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">Leaders & Roles</h1>
      </div>

      <div className="card p-0 overflow-hidden border-zinc-800/80">
        <div className="border-b border-zinc-800/80 px-4 py-3 bg-zinc-900/10">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Active Leaders ({visibleLeaders.length})
          </h2>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {visibleLeaders.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">No leaders in your scope.</p>
          ) : (
            visibleLeaders.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-900/10 transition">
                <div>
                  <div className="text-sm font-semibold text-zinc-200">
                    {l.firstName} {l.lastName}{" "}
                    <span className="text-xs text-zinc-500 font-normal ml-1">@{l.username}</span>
                  </div>
                  <div className="text-xs text-zinc-500 font-medium mt-0.5 flex flex-wrap gap-x-2 gap-y-1 items-center">
                    <span className="font-bold text-zinc-400 bg-zinc-800/40 border border-zinc-700/30 px-1.5 py-0.5 rounded-md">
                      {ROLE_LABELS[l.role as Role]}
                    </span>
                    {l.bacentaId ? ` · Bacenta: ${bacentaName.get(l.bacentaId) ?? "bacenta"}` : ""}
                    {l.governorshipId ? ` · Gov: ${govName.get(l.governorshipId) ?? ""}` : ""}
                    {l.councilId ? ` · Council: ${councilName.get(l.councilId) ?? ""}` : ""}
                    {!l.isActive ? <StatusBadge value="rejected" /> : null}
                  </div>
                </div>
                {l.id !== actor.id ? (
                  <form action={setLeaderActiveAction}>
                    <input type="hidden" name="leaderId" value={l.id} />
                    <input type="hidden" name="active" value={String(!l.isActive)} />
                    <button className={l.isActive ? "btn-danger py-1 px-3 text-xs" : "btn-secondary py-1 px-3 text-xs"}>
                      {l.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <form action={promoteLeaderAction} className="card space-y-4 border-zinc-800/80 max-w-2xl">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Promote or Update Leader
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Attaches login credentials to an existing member. Re-promoting updates their role and resets password.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Member</label>
            <select name="memberId" className="input" required defaultValue="">
              <option value="" disabled>
                Select member
              </option>
              {scopedMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName} — {m.phoneNumber}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" className="input" required defaultValue="">
              <option value="" disabled>
                Select role
              </option>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label text-xs">Council (for Council Leader)</label>
            <select name="councilId" className="input" defaultValue="">
              <option value="">—</option>
              {councilOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Governorship (for Governor)</label>
            <select name="governorshipId" className="input" defaultValue="">
              <option value="">—</option>
              {govOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label text-xs">Bacenta (for Bacenta Leader)</label>
            <select name="bacentaId" className="input" defaultValue="">
              <option value="">—</option>
              {scoped.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.area === "area1" ? "A1" : "A2"})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label text-xs">Username (optional)</label>
            <input name="username" className="input" autoCapitalize="none" placeholder="e.g. kofi.mensah (auto if empty)" />
          </div>
          <div>
            <label className="label text-xs">Password (optional)</label>
            <input name="password" className="input" placeholder="Defaults to 'change-me-now'" />
          </div>
        </div>

        <button className="btn w-full sm:w-auto">Promote / update leader</button>
      </form>
    </div>
  );
}
