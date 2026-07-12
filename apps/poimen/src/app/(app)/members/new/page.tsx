import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { createMemberAction } from "../actions";
import { MemberForm } from "../member-form";

export default async function NewMemberPage() {
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Add member</h1>
      <MemberForm
        action={createMemberAction}
        bacentas={scoped}
        submitLabel="Create member"
      />
    </div>
  );
}
