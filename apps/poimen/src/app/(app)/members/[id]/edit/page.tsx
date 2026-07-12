import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, members, leaders } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canManageMembersOf } from "@qcc/core/permissions";
import { getBacentaScope, getScopedBacentas } from "@qcc/core/scope";
import { updateMemberAction, changePasswordAction, deleteMemberAction } from "../../actions";
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
    <div className="space-y-6">
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

      {isSelf ? (
        <form action={changePasswordAction} className="card max-w-2xl space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Change Password
          </h2>
          <p className="text-xs text-zinc-500">
            Keep your account secure by choosing a strong, unique password.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">New password (min 8 chars)</label>
              <input name="password" type="password" className="input" minLength={8} required />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input name="confirmPassword" type="password" className="input" minLength={8} required />
            </div>
          </div>
          <button className="btn w-full sm:w-auto">Update password</button>
        </form>
      ) : null}

      {/* Danger Zone */}
      <div className="card max-w-2xl border border-red-950/40 bg-red-950/5 p-5 space-y-4">
        <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide">Danger Zone</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Deleting a member will permanently remove their profile, history, and attendance records from the system. This action cannot be undone.
        </p>
        <form action={deleteMemberAction} onSubmit={(e) => {
          if (!confirm("Are you absolutely sure you want to permanently delete this member?")) {
            e.preventDefault();
          }
        }}>
          <input type="hidden" name="memberId" value={m.id} />
          <button className="btn-danger w-full sm:w-auto font-bold py-2.5 px-6">
            Delete Member
          </button>
        </form>
      </div>
    </div>
  );
}
