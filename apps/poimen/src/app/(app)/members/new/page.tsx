import { and, ilike, isNull, or } from "drizzle-orm";

import { db, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { createMemberAction, addExistingMemberAction } from "../actions";
import { MemberForm } from "../member-form";

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ find?: string }>;
}) {
  const { find } = await searchParams;
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);

  // Only members without a bacenta can be found here. Members who already
  // belong to a bacenta are invisible to other leaders — by design.
  const found = find
    ? await db
        .select({
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          phoneNumber: members.phoneNumber,
          photoUrl: members.photoUrl,
        })
        .from(members)
        .where(
          and(
            isNull(members.bacentaId),
            or(
              ilike(members.firstName, `%${find}%`),
              ilike(members.lastName, `%${find}%`),
              ilike(members.phoneNumber, `%${find}%`),
              ilike(members.memberCode, `%${find}%`),
            ),
          ),
        )
        .orderBy(members.firstName, members.lastName)
        .limit(20)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Add member</h1>

      {/* Path 1: member already registered on the app (e.g. self-registered) */}
      <div className="card max-w-2xl space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Already on the app?
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Search for members who registered themselves but don&apos;t belong to a
            bacenta yet, and add them to yours.
          </p>
        </div>
        <form className="flex gap-2">
          <input
            name="find"
            defaultValue={find ?? ""}
            placeholder="Search name, phone or member code…"
            className="input flex-1"
          />
          <button className="btn-secondary shrink-0">Search</button>
        </form>

        {find ? (
          found.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No unassigned member matches “{find}”. They may already belong to a
              bacenta, or aren&apos;t registered yet — you can register them below.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {found.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.photoUrl}
                      alt=""
                      className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-400">
                      {m.firstName[0]}
                      {m.lastName[0]}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{m.phoneNumber}</p>
                  </div>
                  <form action={addExistingMemberAction} className="flex items-center gap-2">
                    <input type="hidden" name="memberId" value={m.id} />
                    {scoped.length === 1 ? (
                      <input type="hidden" name="bacentaId" value={scoped[0].id} />
                    ) : (
                      <select name="bacentaId" className="input max-w-44 py-1.5 text-xs" required>
                        <option value="">Choose bacenta…</option>
                        {scoped.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <button className="btn shrink-0 px-3 py-1.5 text-xs">
                      Add to bacenta
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>

      {/* Path 2: brand-new member */}
      <div className="space-y-3">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Register a new member
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Not on the app yet? Fill in their details.
          </p>
        </div>
        <MemberForm
          action={createMemberAction}
          bacentas={scoped}
          submitLabel="Create member"
        />
      </div>
    </div>
  );
}
