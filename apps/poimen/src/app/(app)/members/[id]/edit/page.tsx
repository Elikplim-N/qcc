import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, members, leaders } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canManageMembersOf } from "@qcc/core/permissions";
import { getBacentaScope, getScopedBacentas } from "@qcc/core/scope";
import { updateMemberAction } from "../../actions";
import { MemberForm } from "../../member-form";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leader = await requireLeader();
  const m = await db.query.members.findFirst({ where: eq(members.id, id) });
  if (!m) notFound();

  const leaderRow = await db.query.leaders.findFirst({
    where: eq(leaders.memberId, m.id),
  });

  const displayBacentaId = (leaderRow && leaderRow.role === "bacenta_leader" && leaderRow.bacentaId)
    ? leaderRow.bacentaId
    : m.bacentaId;

  const scope = displayBacentaId ? await getBacentaScope(displayBacentaId) : null;

  const isSelf = m.id === leader.memberId;
  const isCreator = m.createdByLeaderId === leader.id;
  const isUnassigned = !m.bacentaId;
  const allowed =
    leader.role === "chief_admin" || isSelf || isCreator || isUnassigned || (scope && canManageMembersOf(leader, scope));
  if (!allowed) {
    return (
      <p className="card text-sm text-zinc-400">
        You cannot edit this member.
      </p>
    );
  }

  const scoped = await getScopedBacentas(leader);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">
        Edit {m.firstName} {m.lastName}
      </h1>
      <MemberForm
        action={updateMemberAction}
        bacentas={scoped}
        values={{ ...m, bacentaId: displayBacentaId }}
        submitLabel="Save changes"
      />
    </div>
  );
}
