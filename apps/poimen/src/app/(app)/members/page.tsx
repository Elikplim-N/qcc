import Link from "next/link";
import { and, ilike, inArray, or, type SQL } from "drizzle-orm";

import { db, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { StatusBadge } from "@qcc/ui/components/status-badge";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bacenta?: string }>;
}) {
  const { q, bacenta } = await searchParams;
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const bacentaName = new Map(scoped.map((b) => [b.id, b.name]));

  const filters: SQL[] = [];
  if (leader.role !== "chief_admin") {
    if (ids.length === 0) {
      return <Empty />;
    }
    filters.push(inArray(members.bacentaId, ids));
  }
  if (bacenta && ids.includes(bacenta)) {
    filters.push(inArray(members.bacentaId, [bacenta]));
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
    .select()
    .from(members)
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
        <button className="btn-secondary">Filter</button>
      </form>

      <div className="card divide-y divide-zinc-800 p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">No members found.</p>
        ) : (
          rows.map((m) => (
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
                  {m.bacentaId ? ` · ${bacentaName.get(m.bacentaId) ?? ""}` : ""}
                </div>
              </div>
              <StatusBadge value={m.status} />
            </Link>
          ))
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
