import { and, count, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db, fellowshipAttendanceDays, fellowshipAttendanceEntries } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { serviceWeekOf, formatDate } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { submitFellowshipReportAction } from "./actions";

export default async function FellowshipPage() {
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

  // Fellowship window for the service week: Saturday through Monday
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
          visitorCount: fellowshipAttendanceDays.visitorCount,
          status: fellowshipAttendanceDays.status,
          present: sql<number>`count(*) filter (where ${fellowshipAttendanceEntries.present})`,
          total: count(fellowshipAttendanceEntries.id),
        })
        .from(fellowshipAttendanceDays)
        .leftJoin(
          fellowshipAttendanceEntries,
          eq(fellowshipAttendanceEntries.dayId, fellowshipAttendanceDays.id),
        )
        .where(
          and(
            inArray(fellowshipAttendanceDays.bacentaId, ids),
            gte(fellowshipAttendanceDays.attendanceDate, satStr),
            lte(fellowshipAttendanceDays.attendanceDate, monStr),
          ),
        )
        .groupBy(fellowshipAttendanceDays.id)
    : [];
  const dayByBacenta = new Map(days.map((d) => [d.bacentaId, d]));
  const held = days.length;

  const isBacentaLeader = leader.role === "bacenta_leader";
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Fellowship</h1>
        <p className="text-sm text-zinc-400">Week of {formatDate(weekOf)}</p>
      </div>

      {!isBacentaLeader && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="card">
            <div className="text-xs uppercase text-zinc-500">Held this week</div>
            <div className="text-2xl font-bold text-emerald-400">
              {held}/{scoped.length}
            </div>
          </div>
          <div className="card">
            <div className="text-xs uppercase text-zinc-500">Not yet held</div>
            <div className="text-2xl font-bold text-amber-400">{scoped.length - held}</div>
          </div>
        </div>
      )}

      {isBacentaLeader && (
        <form action={submitFellowshipReportAction} className="card max-w-2xl space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Report fellowship
          </h2>
          <p className="text-xs text-zinc-500">
            Reports that your fellowship happened. Tick individual members in
            Poimen — both record onto the same fellowship day.
          </p>
          {scoped.length === 1 ? (
            <input type="hidden" name="bacentaId" value={scoped[0].id} />
          ) : (
            <div>
              <label className="label">Bacenta</label>
              <select name="bacentaId" className="input" required defaultValue="">
                <option value="" disabled>
                  Select bacenta
                </option>
                {scoped.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date of Service</label>
              <input type="date" name="attendanceDate" className="input" defaultValue={today} required />
            </div>
            <div>
              <label className="label">Attendance</label>
              <input type="number" name="attendanceCount" className="input" min={0} defaultValue={0} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Income (in GHS)</label>
              <input type="number" name="incomeGhs" className="input" min={0} step="0.01" defaultValue={0} required />
            </div>
            <div>
              <label className="label">Number of Tithers</label>
              <input type="number" name="tithersCount" className="input" min={0} defaultValue={0} required />
            </div>
          </div>
          <div>
            <label className="label">Visitors</label>
            <input type="number" name="visitorCount" className="input" min={0} defaultValue={0} />
          </div>
          <div>
            <label className="label">Foreign Currency and Cheques (if any)</label>
            <textarea name="foreignCurrencyDetails" className="input" placeholder="Enter details" rows={2} />
          </div>
          <div>
            <label className="label">Upload Fellowship Picture</label>
            <input type="file" name="photoUrl" className="input" accept="image/*" />
          </div>
          <button className="btn w-full">Submit fellowship report</button>
        </form>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Bacenta</th>
              <th className="px-4 py-3 font-semibold">Governorship</th>
              <th className="px-4 py-3 font-semibold">Fellowship</th>
              <th className="px-4 py-3 font-semibold">Present</th>
              <th className="px-4 py-3 font-semibold">Visitors</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {scoped.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  No bacentas in your scope.
                </td>
              </tr>
            ) : (
              scoped.map((b) => {
                const d = dayByBacenta.get(b.id);
                return (
                  <tr key={b.id} className="hover:bg-zinc-800/30">
                    <td className="whitespace-nowrap px-4 py-3 font-medium">{b.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {b.governorshipName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {d ? (
                        <span className="flex items-center gap-2">
                          <StatusBadge value={d.status} />
                          <span className="text-xs text-zinc-500">
                            {formatDate(d.attendanceDate)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400">Not held</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {d && d.total > 0 ? `${d.present}/${d.total}` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">
                      {d ? d.visitorCount : "—"}
                    </td>
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
