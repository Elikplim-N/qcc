import Link from "next/link";
import { and, count, eq, inArray } from "drizzle-orm";

import {
  db,
  governorships,
  members,
  onTheWaySubmissions,
  premobilisations,
  leaders,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { serviceWeekOf, formatDate } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";

const UsersIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ChurchIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M10 21V12a2 2 0 0 1 4 0v9" />
    <path d="M4 21V10l8-7 8 7v11" />
  </svg>
);

const RocketIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5" />
    <path d="M12 12l9-9-3 12-6 3-3-3z" />
    <path d="M9 15l-3-3" />
  </svg>
);

const CheckCircleIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ShieldIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

export default async function DashboardPage() {
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const weekOf = serviceWeekOf();

  const empty = ids.length === 0;
  const isChief = leader.role === "chief_admin";

  const scopeFilter =
    leader.role === "chief_admin"
      ? undefined
      : empty
        ? undefined
        : inArray(members.bacentaId, ids);

  const [memberCount] = empty && leader.role !== "chief_admin"
    ? [{ n: 0 }]
    : await db
        .select({ n: count() })
        .from(members)
        .where(scopeFilter);

  const govsCountRows = isChief ? await db.select({ n: count() }).from(governorships) : [];
  const totalGovs = govsCountRows[0]?.n ?? 0;

  const premobs = empty
    ? []
    : await db
        .select({ bacentaId: premobilisations.bacentaId })
        .from(premobilisations)
        .where(
          and(
            inArray(premobilisations.bacentaId, ids),
            eq(premobilisations.weekOf, weekOf),
          ),
        );

  const otws = empty
    ? []
    : await db
        .select({
          bacentaId: onTheWaySubmissions.bacentaId,
          status: onTheWaySubmissions.status,
          reportedMembers: onTheWaySubmissions.reportedMembers,
          reportedVisitors: onTheWaySubmissions.reportedVisitors,
        })
        .from(onTheWaySubmissions)
        .where(
          and(
            inArray(onTheWaySubmissions.bacentaId, ids),
            eq(onTheWaySubmissions.weekOf, weekOf),
          ),
        );

  const area1 = scoped.filter((b) => b.area === "area1").length;
  const area2 = scoped.filter((b) => b.area === "area2").length;
  const area2Ids = new Set(scoped.filter((b) => b.area === "area2").map((b) => b.id));
  const premobDone = new Set(premobs.map((p) => p.bacentaId));
  const otwByBacenta = new Map(otws.map((o) => [o.bacentaId, o]));
  const otwFilled = new Set(otws.map((o) => o.bacentaId)).size;
  const onBoardTotal = otws
    .filter((o) => o.status === "submitted")
    .reduce((s, o) => s + o.reportedMembers + o.reportedVisitors, 0);
  const arrivedTotal = otws
    .filter((o) => o.status === "approved")
    .reduce((s, o) => s + o.reportedMembers + o.reportedVisitors, 0);

  const bacentaLeaderMap = new Map();
  for (const b of scoped) {
    const leaderRecord = await db.query.leaders.findFirst({
      where: eq(leaders.bacentaId, b.id),
    });
    if (leaderRecord) {
      const member = await db.query.members.findFirst({
        where: eq(members.id, leaderRecord.memberId),
      });
      bacentaLeaderMap.set(b.id, member?.firstName ?? "");
    }
  }

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
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Service week: {formatDate(weekOf)}
          </div>
        </div>
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-36 w-36 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Members"
          value={memberCount.n}
          icon={UsersIcon}
          borderColor="border-t-indigo-500"
        />
        {isChief && (
          <Stat
            label="Governorships"
            value={totalGovs}
            icon={ShieldIcon}
            borderColor="border-t-sky-500"
            href="/hierarchy"
          />
        )}
        <Stat
          label="Bacentas"
          value={scoped.length}
          sub={`${area1} A1 · ${area2} A2`}
          icon={ChurchIcon}
          borderColor="border-t-violet-500"
          href={isChief ? "/hierarchy" : undefined}
        />
        <Stat
          label="Pre-mob this week"
          value={`${premobDone.size}/${scoped.length}`}
          href={leader.role === "bacenta_leader" ? "/arrivals" : "/arrivals/monitor"}
          icon={RocketIcon}
          borderColor="border-t-amber-500"
        />
        <Stat
          label="On-the-Way forms"
          value={`${otwFilled}/${area2}`}
          sub="Area 2 bacentas"
          href="/arrivals/monitor"
          icon={RocketIcon}
          borderColor="border-t-amber-500"
        />
        <Stat
          label="On the way"
          value={onBoardTotal}
          sub="On board, not yet confirmed"
          href="/arrivals/monitor"
          icon={RocketIcon}
          borderColor="border-t-violet-500"
        />
        <Stat
          label="In church (confirmed)"
          value={arrivedTotal}
          sub="Approved arrivals"
          href="/arrivals/monitor"
          icon={CheckCircleIcon}
          borderColor="border-t-emerald-500"
        />
      </div>

      <div className="card">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          This week by bacenta
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {scoped.length === 0 ? (
            <div className="empty-state sm:col-span-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="font-semibold text-zinc-400">No bacentas in your scope yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">Contact your overseer to get assigned bacentas.</p>
            </div>
          ) : (
            scoped.map((b) => {
              const otw = otwByBacenta.get(b.id);
              const leaderName = bacentaLeaderMap.get(b.id);
              return (
                <Link
                  key={b.id}
                  href={`/hierarchy/bacentas/${b.id}`}
                  className="card-interactive flex flex-wrap items-center justify-between gap-3 p-3.5 transition-all duration-200"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-zinc-200 block">{b.name}</span>
                      {leaderName && <span className="text-xs text-zinc-500">{leaderName}</span>}
                    </div>
                    <StatusBadge value={b.area} />
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={`font-semibold ${
                        premobDone.has(b.id) ? "text-emerald-400" : "text-zinc-500"
                      }`}
                    >
                      {premobDone.has(b.id) ? "✓ Pre-mob" : "Pre-mob pending"}
                    </span>
                    {area2Ids.has(b.id) ? (
                      otw ? (
                        <StatusBadge value={otw.status} />
                      ) : (
                        <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[11px] border border-zinc-800 text-zinc-500 font-medium">No otw</span>
                      )
                    ) : null}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
  icon,
  borderColor,
}: {
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
  icon?: React.ReactNode;
  borderColor?: string;
}) {
  const body = (
    <div className={`card h-full border-t-2 ${borderColor ?? "border-t-zinc-800"} hover:border-zinc-700 hover:bg-zinc-900/40 cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-zinc-500 font-semibold">{label}</div>
        {icon && <div className="text-zinc-400 bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-800/50">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-500 font-medium">{sub}</div> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
