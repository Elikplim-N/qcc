import Link from "next/link";
import { and, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";

import { db, members, leaders } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { StatusBadge } from "@qcc/ui/components/status-badge";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bacenta?: string; status?: string }>;
}) {
  const { q, bacenta, status } = await searchParams;
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const bacentaName = new Map(scoped.map((b) => [b.id, b.name]));

  const filters: SQL[] = [];
  if (leader.role !== "chief_admin") {
    const listFilters: SQL[] = [];
    if (ids.length > 0) {
      listFilters.push(inArray(members.bacentaId, ids));
    }
    if (q) {
      listFilters.push(isNull(members.bacentaId));
    }
    if (listFilters.length > 0) {
      filters.push(or(...listFilters)!);
    }
  }
  if (bacenta && (leader.role === "chief_admin" || ids.includes(bacenta))) {
    filters.push(inArray(members.bacentaId, [bacenta]));
  }
  if (status && ["committed", "unstable", "lost"].includes(status)) {
    filters.push(eq(members.status, status as "committed" | "unstable" | "lost"));
  }
  if (q) {
    const like = `%${q}%`;
    filters.push(
      or(
        ilike(members.firstName, like),
        ilike(members.lastName, like),
        ilike(members.phoneNumber, like),
        ilike(members.memberCode, like),
      )!,
    );
  }

  const rows = await db
    .select({
      id: members.id,
      firstName: members.firstName,
      lastName: members.lastName,
      phoneNumber: members.phoneNumber,
      photoUrl: members.photoUrl,
      bacentaId: members.bacentaId,
      status: members.status,
      leaderRole: leaders.role,
      leaderBacentaId: leaders.bacentaId,
    })
    .from(members)
    .leftJoin(leaders, eq(members.id, leaders.memberId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(members.firstName, members.lastName)
    .limit(300);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Members</h1>
        <Link href="/members/new" className="btn">
          + Add member
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name, phone or code…"
          className="input max-w-xs"
        />
        <select name="bacenta" defaultValue={bacenta ?? ""} className="input max-w-52">
          <option value="">All bacentas</option>
          {scoped.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="input max-w-40">
          <option value="">All statuses</option>
          <option value="committed">Committed</option>
          <option value="unstable">Unstable</option>
          <option value="lost">Lost</option>
        </select>
        <button className="btn-secondary">Filter</button>
      </form>

      <div className="card divide-y divide-zinc-800 p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No members found.</p>
        ) : (
          rows.map((m) => {
            const displayBacentaId = (m.leaderRole === "bacenta_leader" && m.leaderBacentaId)
              ? m.leaderBacentaId
              : m.bacentaId;

            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-zinc-900"
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt=""
                    className="h-10 w-10 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-400">
                    {m.firstName[0]}
                    {m.lastName[0]}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {m.firstName} {m.lastName}
                  </div>
                  <div className="truncate text-xs text-zinc-500">
                    {m.phoneNumber}
                    {displayBacentaId ? ` · ${bacentaName.get(displayBacentaId) ?? ""}` : ""}
                  </div>
                </div>
                <StatusBadge value={m.status} />
              </Link>
            );
          })
        )}
      </div>
      <p className="text-xs text-zinc-600">{rows.length} shown (max 300)</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="card text-sm text-zinc-400">
      No bacentas in your scope yet — ask your leader to assign you.
    </div>
  );
}
