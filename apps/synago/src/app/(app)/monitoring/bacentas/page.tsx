import Link from "next/link";
import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db, fellowshipAttendanceDays, fellowshipAttendanceEntries, bacentas } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { serviceWeekOf, formatDate, cediFromPesewas } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";

export default async function BacentasMonitoringPage() {
  const leader = await requireLeader();
  const pastoral = ["chief_admin", "council_leader", "governor", "bacenta_leader"].includes(
    leader.role,
  );
  if (!pastoral) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
  }

  const scoped = await getScopedBacentas(leader);
  const ids = scoped.map((b) => b.id);
  const weekOf = serviceWeekOf();

  const sunday = new Date(weekOf);
  const sat = new Date(sunday);
  sat.setDate(sunday.getDate() - 1);
  const mon = new Date(sunday);
  mon.setDate(sunday.getDate() + 1);
  const satStr = sat.toISOString().split("T")[0];
  const monStr = mon.toISOString().split("T")[0];

  const days = ids.length
    ? await db
        .select({
          id: fellowshipAttendanceDays.id,
          bacentaId: fellowshipAttendanceDays.bacentaId,
          attendanceDate: fellowshipAttendanceDays.attendanceDate,
          attendanceCount: fellowshipAttendanceDays.attendanceCount,
          visitorCount: fellowshipAttendanceDays.visitorCount,
          incomePesewas: fellowshipAttendanceDays.incomePesewas,
          tithersCount: fellowshipAttendanceDays.tithersCount,
          photoUrl: fellowshipAttendanceDays.photoUrl,
          status: fellowshipAttendanceDays.status,
        })
        .from(fellowshipAttendanceDays)
        .where(
          and(
            inArray(fellowshipAttendanceDays.bacentaId, ids),
            gte(fellowshipAttendanceDays.attendanceDate, satStr),
            lte(fellowshipAttendanceDays.attendanceDate, monStr),
          ),
        )
    : [];

  const dayByBacenta = new Map(days.map((d) => [d.bacentaId, d]));
  const submitted = days.filter((d) => d.status === "submitted").length;
  const approved = days.filter((d) => d.status === "approved").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Bacenta Monitoring</h1>
        <p className="text-sm text-zinc-400">Week of {formatDate(weekOf)}</p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Reported</div>
          <div className="text-2xl font-bold text-emerald-400">{submitted + approved}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Pending</div>
          <div className="text-2xl font-bold text-amber-400">{submitted}</div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-zinc-500">Approved</div>
          <div className="text-2xl font-bold text-sky-400">{approved}</div>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Bacenta</th>
              <th className="px-4 py-3 font-semibold">Attendance</th>
              <th className="px-4 py-3 font-semibold">Visitors</th>
              <th className="px-4 py-3 font-semibold">Income</th>
              <th className="px-4 py-3 font-semibold">Tithers</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {scoped.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                  No bacentas in your scope.
                </td>
              </tr>
            ) : (
              scoped.map((b) => {
                const d = dayByBacenta.get(b.id);
                return (
                  <tr key={b.id} className="hover:bg-zinc-800/30">
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-zinc-400">{d?.attendanceCount ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{d?.visitorCount ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {d?.incomePesewas ? cediFromPesewas(d.incomePesewas) : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{d?.tithersCount ?? "—"}</td>
                    <td className="px-4 py-3">
                      {d ? <StatusBadge value={d.status} /> : <span className="text-xs text-amber-400">Not reported</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{d ? formatDate(d.attendanceDate) : "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
