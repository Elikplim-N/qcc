import { eq, inArray } from "drizzle-orm";

import { db, bacentas, councils, governorships, leaders, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { ROLE_LABELS, type Role } from "@qcc/core/permissions";
import { getScopedBacentas } from "@qcc/core/scope";
import { promoteLeaderAction, setLeaderActiveAction } from "../actions";

export default async function LeadersPage() {
  const actor = await requireLeader();
  if (!["chief_admin", "council_leader", "governor"].includes(actor.role)) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
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
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Leaders & roles</h1>

      <div className="card divide-y divide-zinc-800 p-0">
        {visibleLeaders.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No leaders in your scope.</p>
        ) : (
          visibleLeaders.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <div className="text-sm font-medium">
                  {l.firstName} {l.lastName}{" "}
                  <span className="text-xs text-zinc-500">@{l.username}</span>
                </div>
                <div className="text-xs text-zinc-500">
                  {ROLE_LABELS[l.role as Role]}
                  {l.bacentaId ? ` · ${bacentaName.get(l.bacentaId) ?? "bacenta"}` : ""}
                  {l.governorshipId ? ` · ${govName.get(l.governorshipId) ?? ""}` : ""}
                  {l.councilId ? ` · ${councilName.get(l.councilId) ?? ""}` : ""}
                  {!l.isActive ? " · DEACTIVATED" : ""}
                </div>
              </div>
              {l.id !== actor.id ? (
                <form action={setLeaderActiveAction}>
                  <input type="hidden" name="leaderId" value={l.id} />
                  <input type="hidden" name="active" value={String(!l.isActive)} />
                  <button className={l.isActive ? "btn-danger" : "btn-secondary"}>
                    {l.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </div>

      <form action={promoteLeaderAction} className="card max-w-xl space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Promote a member to leader
        </h2>
        <p className="text-xs text-zinc-500">
          Attaches a login to an existing member record — never creates a
          duplicate person. Re-promoting an existing leader updates their role
          and resets their password.
        </p>
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
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Council (if council leader)</label>
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
            <label className="label">Governorship (if governor)</label>
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
            <label className="label">Bacenta (if bacenta leader)</label>
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
            <label className="label">Username (optional)</label>
            <input name="username" className="input" autoCapitalize="none" placeholder="e.g. kofi.mensah (auto if empty)" />
          </div>
          <div>
            <label className="label">Password (optional)</label>
            <input name="password" className="input" placeholder="Defaults to 'change-me-now'" />
          </div>
        </div>
        <button className="btn">Promote / update leader</button>
      </form>
    </div>
  );
}
