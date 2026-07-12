import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, members } from "@/db";
import { requireLeader } from "@/lib/auth";
import { canManageMembersOf } from "@/lib/permissions";
import { getBacentaScope, getScopedBacentas } from "@/lib/scope";
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

  const scope = m.bacentaId ? await getBacentaScope(m.bacentaId) : null;
  const allowed =
    leader.role === "chief_admin" || (scope && canManageMembersOf(leader, scope));
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
        values={{ ...m }}
        submitLabel="Save changes"
      />
    </div>
  );
}
