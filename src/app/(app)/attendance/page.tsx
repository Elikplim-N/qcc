import Link from "next/link";
import { desc, eq, inArray, sql } from "drizzle-orm";

import { db, serviceAttendanceDays, serviceAttendanceEntries } from "@/db";
import { requireLeader } from "@/lib/auth";
import { getScopedBacentas } from "@/lib/scope";
import { formatDate } from "@/lib/week";
import { StatusBadge } from "@/components/status-badge";

export default async function AttendancePage() {
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const bacentaName = new Map(scoped.map((b) => [b.id, b.name]));

  const days =
    ids.length === 0
      ? []
      : await db
          .select({
            id: serviceAttendanceDays.id,
            serviceDate: serviceAttendanceDays.serviceDate,
            bacentaId: serviceAttendanceDays.bacentaId,
            status: serviceAttendanceDays.status,
            visitorCount: serviceAttendanceDays.visitorCount,
            present: sql<number>`count(*) filter (where ${serviceAttendanceEntries.present})`,
            total: sql<number>`count(${serviceAttendanceEntries.id})`,
          })
          .from(serviceAttendanceDays)
          .leftJoin(
            serviceAttendanceEntries,
            eq(serviceAttendanceEntries.dayId, serviceAttendanceDays.id),
          )
          .where(inArray(serviceAttendanceDays.bacentaId, ids))
          .groupBy(serviceAttendanceDays.id)
          .orderBy(desc(serviceAttendanceDays.serviceDate))
          .limit(60);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Service attendance</h1>
        <Link href="/attendance/record" className="btn">
          + Record
        </Link>
      </div>

      <div className="card divide-y divide-zinc-800 p-0">
        {days.length === 0 ? (
          <p className="p-4 text-sm text-zinc-500">
            Nothing recorded yet in your scope.
          </p>
        ) : (
          days.map((d) => (
            <Link
              key={d.id}
              href={`/attendance/${d.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-zinc-900"
            >
              <div>
                <div className="text-sm font-medium">
                  {bacentaName.get(d.bacentaId) ?? "Bacenta"}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatDate(d.serviceDate)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">
                  <span className="font-semibold text-emerald-400">{d.present}</span>
                  <span className="text-zinc-500">/{d.total}</span>
                  {d.visitorCount > 0 ? (
                    <span className="ml-2 text-xs text-zinc-500">
                      +{d.visitorCount} visitors
                    </span>
                  ) : null}
                </span>
                <StatusBadge value={d.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
