import Link from "next/link";
import { and, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";

import { db, members, leaders } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { MemberCard } from "@qcc/ui/components/member-card";
import { StatusBadge } from "@qcc/ui/components/status-badge";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bacenta?: string; status?: string; view?: string }>;
}) {
  const { q, bacenta, status, view } = await searchParams;
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const bacentaName = new Map(scoped.map((b) => [b.id, b.name]));
  const tableView = view === "table";

  const filters: SQL[] = [];
  // Chief admin and council leaders see all members (council leaders need
  // church-wide visibility to promote members). Other leaders only see
  // members of bacentas they oversee, plus unassigned members when searching
  // — members of someone else's bacenta never appear in their list or search.
  const seesAll = leader.role === "chief_admin" || leader.role === "council_leader";
  if (!seesAll) {
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
  if (bacenta && (seesAll || ids.includes(bacenta))) {
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
      location: members.location,
      leaderRole: leaders.role,
      leaderBacentaId: leaders.bacentaId,
    })
    .from(members)
    .leftJoin(leaders, eq(members.id, leaders.memberId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(members.firstName, members.lastName)
    .limit(300);

  const withBacenta = rows.map((m) => {
    const displayBacentaId =
      m.leaderRole === "bacenta_leader" && m.leaderBacentaId
        ? m.leaderBacentaId
        : m.bacentaId;
    return {
      ...m,
      subtitle: displayBacentaId ? bacentaName.get(displayBacentaId) ?? null : null,
    };
  });

  const committed = withBacenta.filter((m) => m.status === "committed").length;
  const unstable = withBacenta.filter((m) => m.status === "unstable").length;

  // preserve current filters when switching view
  const viewParams = (v: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (bacenta) p.set("bacenta", bacenta);
    if (status) p.set("status", status);
    if (v === "table") p.set("view", "table");
    const s = p.toString();
    return s ? `/members?${s}` : "/members";
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-0.5 text-xs text-zinc-500">
            {withBacenta.length} member{withBacenta.length === 1 ? "" : "s"}
            {committed ? ` · ${committed} committed` : ""}
            {unstable ? ` · ${unstable} unstable` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {leader.role === "chief_admin" && (
            <Link href="/members/duplicates" className="btn-secondary text-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
                <circle cx="15" cy="15" r="6" stroke="currentColor" strokeWidth="2" />
              </svg>
              Duplicates
            </Link>
          )}
          <Link href="/members/new" className="btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Add member
          </Link>
        </div>
      </div>

      {/* Search + filters */}
      <form className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name, phone or code…"
            className="input pl-9"
          />
        </div>
        <select name="bacenta" defaultValue={bacenta ?? ""} className="input max-w-48">
          <option value="">All bacentas</option>
          {scoped.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} className="input max-w-36">
          <option value="">All statuses</option>
          <option value="committed">Committed</option>
          <option value="unstable">Unstable</option>
          <option value="lost">Lost</option>
        </select>
        {tableView ? <input type="hidden" name="view" value="table" /> : null}
        <button className="btn-secondary">Filter</button>

        {/* view toggle */}
        <div className="ml-auto flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
          <Link
            href={viewParams("gallery")}
            className={`rounded-md px-2.5 py-1.5 transition ${!tableView ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Gallery view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
              <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
            </svg>
          </Link>
          <Link
            href={viewParams("table")}
            className={`rounded-md px-2.5 py-1.5 transition ${tableView ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
            title="Table view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </form>

      {/* Results */}
      {withBacenta.length === 0 ? (
        <div className="empty-state card">
          <p className="font-medium text-zinc-400">No members found</p>
          <p className="mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : tableView ? (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Bacenta</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {withBacenta.map((m) => (
                <tr key={m.id} className="transition hover:bg-zinc-900">
                  <td className="px-4 py-2.5">
                    <Link href={`/members/${m.id}`} className="flex items-center gap-2.5">
                      {m.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.photoUrl}
                          alt=""
                          className="h-8 w-8 rounded-full border border-zinc-700 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-400">
                          {m.firstName[0]}
                          {m.lastName[0]}
                        </span>
                      )}
                      <span className="font-medium text-white">
                        {m.firstName} {m.lastName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-400">{m.phoneNumber}</td>
                  <td className="hidden px-4 py-2.5 text-zinc-400 md:table-cell">
                    {m.subtitle ?? "—"}
                  </td>
                  <td className="hidden px-4 py-2.5 text-zinc-400 md:table-cell">
                    {m.location ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge value={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sm:grid sm:grid-cols-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {withBacenta.map((m) => (
            <MemberCard key={m.id} member={m} href={`/members/${m.id}`} />
          ))}
        </div>
      )}
      <p className="text-xs text-zinc-600">{withBacenta.length} shown (max 300)</p>
    </div>
  );
}
