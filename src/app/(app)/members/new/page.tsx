import { requireLeader } from "@/lib/auth";
import { getScopedBacentas } from "@/lib/scope";
import { createMemberAction } from "../actions";
import { MemberForm } from "../member-form";

export default async function NewMemberPage() {
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Add member</h1>
      {scoped.length === 0 ? (
        <p className="card text-sm text-zinc-400">
          You need at least one bacenta in your scope before adding members.
        </p>
      ) : (
        <MemberForm
          action={createMemberAction}
          bacentas={scoped}
          submitLabel="Create member"
        />
      )}
    </div>
  );
}
