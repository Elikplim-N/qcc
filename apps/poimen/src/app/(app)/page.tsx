import Link from "next/link";
import { count, desc, eq, inArray, and, gte, lte, sql } from "drizzle-orm";

import {
  db,
  members,
  serviceAttendanceDays,
  serviceAttendanceEntries,
  fellowshipAttendanceDays,
  fellowshipAttendanceEntries,
  governorships,
  bacentas,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { serviceWeekOf } from "@qcc/core/week";
import { getMissingMembers } from "@qcc/core/reports";

const UsersIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HeartIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const ShieldIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const BranchIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 9v6" />
    <path d="M9 6h6" />
    <path d="M6 9v9h9" />
  </svg>
);

export default async function PoimenDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const activeTab = sp.tab || "service";

  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const bacentaById = new Map(scoped.map((b) => [b.id, b]));

  const pastoral = [
    "chief_admin",
    "council_leader",
    "governor",
    "bacenta_leader",
  ].includes(leader.role);

  if (!pastoral) {
    return (
      <div className="card text-sm text-zinc-400 p-6 flex flex-col items-center justify-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="font-semibold text-zinc-300">Access Restricted</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Poimen is the member-focused app for pastoral leaders. Your role uses
          Synago (arrivals) instead.
        </p>
      </div>
    );
  }

  const isChief = leader.role === "chief_admin";
  const scopeFilter =
    leader.role === "chief_admin" ? undefined : inArray(members.bacentaId, ids);

  const [rows, recent, govsCountRows, bacentasCountRows] = await Promise.all([
    db
      .select({ status: members.status, n: count() })
      .from(members)
      .where(scopeFilter)
      .groupBy(members.status),
    db
      .select()
      .from(members)
      .where(scopeFilter)
      .orderBy(desc(members.createdAt))
      .limit(8),
    isChief ? db.select({ n: count() }).from(governorships) : Promise.resolve([]),
    isChief ? db.select({ n: count() }).from(bacentas) : Promise.resolve([]),
  ]);

  const byStatus = new Map(rows.map((r) => [r.status, r.n]));
  const total = rows.reduce((s, r) => s + r.n, 0);
  const totalGovs = govsCountRows[0]?.n ?? 0;
  const totalBacentas = bacentasCountRows[0]?.n ?? 0;

  // Statistics Calculation
  const currentWeek = serviceWeekOf();
  const empty = ids.length === 0;

  // Query service attendance for this week
  const serviceDays = empty
    ? []
    : await db
        .select({
          id: serviceAttendanceDays.id,
          bacentaId: serviceAttendanceDays.bacentaId,
          status: serviceAttendanceDays.status,
          visitorCount: serviceAttendanceDays.visitorCount,
          present: sql<number>`count(*) filter (where ${serviceAttendanceEntries.present})`,
          total: sql<number>`count(${serviceAttendanceEntries.id})`,
        })
        .from(serviceAttendanceDays)
        .leftJoin(serviceAttendanceEntries, eq(serviceAttendanceEntries.dayId, serviceAttendanceDays.id))
        .where(
          and(
            inArray(serviceAttendanceDays.bacentaId, ids),
            eq(serviceAttendanceDays.serviceDate, currentWeek)
          )
        )
        .groupBy(serviceAttendanceDays.id);

  // Query fellowship attendance for this week (Sat-Mon)
  const sunday = new Date(currentWeek);
  const sat = new Date(sunday);
  sat.setDate(sunday.getDate() - 1);
  const mon = new Date(sunday);
  mon.setDate(sunday.getDate() + 1);
  const satStr = sat.toISOString().split("T")[0];
  const monStr = mon.toISOString().split("T")[0];

  const fellowshipDays = empty
    ? []
    : await db
        .select({
          id: fellowshipAttendanceDays.id,
          bacentaId: fellowshipAttendanceDays.bacentaId,
          status: fellowshipAttendanceDays.status,
          visitorCount: fellowshipAttendanceDays.visitorCount,
          present: sql<number>`count(*) filter (where ${fellowshipAttendanceEntries.present})`,
          total: sql<number>`count(${fellowshipAttendanceEntries.id})`,
        })
        .from(fellowshipAttendanceDays)
        .leftJoin(fellowshipAttendanceEntries, eq(fellowshipAttendanceEntries.dayId, fellowshipAttendanceDays.id))
        .where(
          and(
            inArray(fellowshipAttendanceDays.bacentaId, ids),
            gte(fellowshipAttendanceDays.attendanceDate, satStr),
            lte(fellowshipAttendanceDays.attendanceDate, monStr)
          )
        )
        .groupBy(fellowshipAttendanceDays.id);

  const serviceMap = new Map(serviceDays.map((d) => [d.bacentaId, d]));
  const fellowshipMap = new Map(fellowshipDays.map((d) => [d.bacentaId, d]));

  // Scoped member counts per bacenta
  const memberCounts = empty
    ? []
    : await db
        .select({ bacentaId: members.bacentaId, count: sql<number>`count(*)` })
        .from(members)
        .where(inArray(members.bacentaId, ids))
        .groupBy(members.bacentaId);
  const countsMap = new Map(memberCounts.map((c) => [c.bacentaId, c.count]));

  // Flagged members (consecutive absences)
  const flagged = await getMissingMembers(ids);

  return (
    <div className="space-y-6 animate-[slide-up_0.2s_ease-out]">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-r from-indigo-950/20 via-zinc-900/60 to-zinc-900/30 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100">
              Welcome back, {leader.fullName.split(" ")[0]}
            </h1>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-zinc-950/50 px-3 py-1.5 text-xs font-semibold text-indigo-300 border border-indigo-900/30 md:mt-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Scope: {scoped.length} {scoped.length === 1 ? "bacenta" : "bacentas"}
          </div>
        </div>
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className={`grid gap-4 ${isChief ? "sm:grid-cols-4 grid-cols-2 max-w-4xl" : "grid-cols-2 max-w-md"}`}>
        <Stat
          label="Members"
          value={total}
          icon={UsersIcon}
          borderColor="border-t-indigo-500"
          href="/members"
        />
        <Stat
          label="Committed"
          value={byStatus.get("committed") ?? 0}
          tone="text-emerald-400"
          icon={HeartIcon}
          borderColor="border-t-emerald-500"
          href="/members?status=committed"
        />
        {isChief && (
          <>
            <Stat
              label="Governorships"
              value={totalGovs}
              icon={ShieldIcon}
              borderColor="border-t-amber-500"
            />
            <Stat
              label="Bacentas"
              value={totalBacentas}
              icon={BranchIcon}
              borderColor="border-t-sky-500"
            />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/members" className="btn min-w-[130px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Open directory
        </Link>
        <Link href="/members/new" className="btn-secondary min-w-[130px]">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add member
        </Link>
      </div>

      {/* Flagged / Missing services warning for Governor or Chief Admin */}
      {flagged.length > 0 && (
        <div className="card border-red-950/40 bg-red-950/10 p-4 space-y-3">
          <div className="flex items-center gap-2.5 text-red-400 font-bold text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Alert: members missing 2+ consecutive services!</span>
          </div>
          <div className="divide-y divide-red-950/20 text-xs">
            {flagged.slice(0, 5).map((f) => (
              <div key={f.id} className="py-2 flex justify-between items-center text-zinc-300">
                <div>
                  <span className="font-semibold text-zinc-100">{f.firstName} {f.lastName}</span>
                  <span className="text-zinc-500 ml-1">({f.bacentaName})</span>
                </div>
                <span className="text-red-400 font-semibold">Missed: {f.missedDates.join(", ")}</span>
              </div>
            ))}
            {flagged.length > 5 && (
              <div className="pt-2 text-zinc-500 text-center">
                And {flagged.length - 5} more members...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabbed Stats Overview */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-zinc-800 bg-zinc-950/20 px-2">
          <Link
            href="/?tab=service"
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "service"
                ? "border-b-2 border-indigo-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Service Stats
          </Link>
          <Link
            href="/?tab=fellowship"
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "fellowship"
                ? "border-b-2 border-indigo-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Fellowship Stats
          </Link>
          <Link
            href="/?tab=recent"
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === "recent"
                ? "border-b-2 border-indigo-500 text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Recently Added
          </Link>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {activeTab === "service" && (
            scoped.length === 0 ? (
              <p className="p-4 text-xs text-zinc-500 text-center">No bacentas in your scope.</p>
            ) : (
              scoped.map((b) => {
                const s = serviceMap.get(b.id);
                const totalM = countsMap.get(b.id) ?? 0;
                const percent = s && s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
                return (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
                    <div>
                      <div className="font-semibold text-zinc-200">{b.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{b.governorshipName}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-zinc-400">
                        {s ? `${s.present}/${s.total} (${percent}%)` : `0/${totalM} (0%)`}
                      </span>
                      <StatusBadge value={s ? s.status : "unsubmitted"} />
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === "fellowship" && (
            scoped.length === 0 ? (
              <p className="p-4 text-xs text-zinc-500 text-center">No bacentas in your scope.</p>
            ) : (
              scoped.map((b) => {
                const f = fellowshipMap.get(b.id);
                const totalM = countsMap.get(b.id) ?? 0;
                const percent = f && f.total > 0 ? Math.round((f.present / f.total) * 100) : 0;
                return (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3.5 text-sm">
                    <div>
                      <div className="font-semibold text-zinc-200">{b.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{b.governorshipName}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-zinc-400">
                        {f ? `${f.present}/${f.total} (${percent}%)` : `0/${totalM} (0%)`}
                      </span>
                      <StatusBadge value={f ? f.status : "unsubmitted"} />
                    </div>
                  </div>
                );
              })
            )
          )}

          {activeTab === "recent" && (
            recent.length === 0 ? (
              <div className="empty-state">
                <p className="font-semibold text-zinc-400">No members found</p>
              </div>
            ) : (
              recent.map((m) => (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm transition hover:bg-zinc-900/60 hover:text-white"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-zinc-200">
                      {m.firstName} {m.lastName}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {m.bacentaId ? bacentaById.get(m.bacentaId)?.name : "Unassigned"}
                    </span>
                  </div>
                  <StatusBadge value={m.status} />
                </Link>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
  borderColor,
  href,
}: {
  label: string;
  value: number;
  tone?: string;
  icon?: React.ReactNode;
  borderColor?: string;
  href?: string;
}) {
  const body = (
    <div className={`card h-full border-t-2 ${borderColor ?? "border-t-zinc-800"} hover:border-zinc-700 hover:bg-zinc-900/40 cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">{label}</div>
        {icon && <div className="text-zinc-400 bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-800/50">{icon}</div>}
      </div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${tone ?? "text-zinc-100"}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
