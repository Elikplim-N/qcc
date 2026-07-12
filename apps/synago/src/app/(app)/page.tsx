import Link from "next/link";
import { and, count, eq, inArray, sql } from "drizzle-orm";

import {
  db,
  members,
  onTheWaySubmissions,
  premobilisations,
  serviceAttendanceDays,
  serviceAttendanceEntries,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { serviceWeekOf, formatDate } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";

export default async function DashboardPage() {
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const weekOf = serviceWeekOf();

  const empty = ids.length === 0;

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

  // Attendance summary for the most recent recorded service date in scope
  const lastDay = empty
    ? []
    : await db
        .select({
          serviceDate: serviceAttendanceDays.serviceDate,
          present: sql<number>`count(*) filter (where ${serviceAttendanceEntries.present})`,
          total: count(serviceAttendanceEntries.id),
        })
        .from(serviceAttendanceDays)
        .leftJoin(
          serviceAttendanceEntries,
          eq(serviceAttendanceEntries.dayId, serviceAttendanceDays.id),
        )
        .where(inArray(serviceAttendanceDays.bacentaId, ids))
        .groupBy(serviceAttendanceDays.serviceDate)
        .orderBy(sql`${serviceAttendanceDays.serviceDate} desc`)
        .limit(1);

  const area1 = scoped.filter((b) => b.area === "area1").length;
  const area2 = scoped.filter((b) => b.area === "area2").length;
  const area2Ids = new Set(scoped.filter((b) => b.area === "area2").map((b) => b.id));
  const premobDone = new Set(premobs.map((p) => p.bacentaId));
  const otwByBacenta = new Map(otws.map((o) => [o.bacentaId, o]));
  const arrivedTotal = otws
    .filter((o) => o.status === "approved")
    .reduce((s, o) => s + o.reportedMembers + o.reportedVisitors, 0);

  const isPastoral = [
    "chief_admin",
    "council_leader",
    "governor",
    "bacenta_leader",
  ].includes(leader.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Welcome, {leader.fullName.split(" ")[0]}</h1>
        <p className="text-sm text-zinc-400">
          Service week of {formatDate(weekOf)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Members" value={memberCount.n} />
        <Stat label="Bacentas" value={scoped.length} sub={`${area1} A1 · ${area2} A2`} />
        <Stat
          label="Pre-mob this week"
          value={`${premobDone.size}/${scoped.length}`}
          href={leader.role === "bacenta_leader" ? "/arrivals" : "/arrivals/monitor"}
        />
        <Stat
          label="Arrived (approved)"
          value={arrivedTotal}
          href="/arrivals/monitor"
        />
      </div>

      {lastDay[0] ? (
        <div className="card">
          <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
            Last service attendance — {formatDate(lastDay[0].serviceDate)}
          </div>
          <div className="text-2xl font-bold">
            {lastDay[0].present}
            <span className="text-base font-normal text-zinc-400">
              {" "}
              / {lastDay[0].total} present
            </span>
          </div>
          <Link href="/attendance" className="mt-2 inline-block text-sm text-zinc-400 underline">
            View attendance
          </Link>
        </div>
      ) : isPastoral ? (
        <div className="card text-sm text-zinc-400">
          No service attendance recorded yet.{" "}
          <Link className="underline" href="/attendance">
            Record the first one
          </Link>
          .
        </div>
      ) : null}

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          This week by bacenta
        </h2>
        <div className="space-y-2">
          {scoped.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No bacentas in your scope yet.
            </p>
          ) : (
            scoped.map((b) => {
              const otw = otwByBacenta.get(b.id);
              return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{b.name}</span>
                    <StatusBadge value={b.area} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={
                        premobDone.has(b.id) ? "text-emerald-400" : "text-zinc-500"
                      }
                    >
                      {premobDone.has(b.id) ? "✓ Pre-mob" : "Pre-mob pending"}
                    </span>
                    {area2Ids.has(b.id) ? (
                      otw ? (
                        <StatusBadge value={otw.status} />
                      ) : (
                        <span className="text-zinc-500">No on-the-way</span>
                      )
                    ) : null}
                  </div>
                </div>
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
}: {
  label: string;
  value: number | string;
  sub?: string;
  href?: string;
}) {
  const body = (
    <div className="card h-full">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub ? <div className="text-xs text-zinc-500">{sub}</div> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
