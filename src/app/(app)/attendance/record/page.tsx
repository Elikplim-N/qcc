import { and, eq, inArray } from "drizzle-orm";

import { db, members, serviceAttendanceDays, serviceAttendanceEntries } from "@/db";
import { requireLeader } from "@/lib/auth";
import { getScopedBacentas } from "@/lib/scope";
import { serviceWeekOf } from "@/lib/week";
import { saveAttendanceAction } from "../actions";

export default async function RecordAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ bacenta?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);

  if (scoped.length === 0) {
    return (
      <p className="card text-sm text-zinc-400">No bacentas in your scope.</p>
    );
  }

  const bacentaId =
    sp.bacenta && scoped.some((b) => b.id === sp.bacenta)
      ? sp.bacenta
      : scoped.length === 1
        ? scoped[0].id
        : null;
  const serviceDate = sp.date ?? serviceWeekOf();

  // Step 1: choose bacenta + date
  if (!bacentaId) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-bold">Record attendance</h1>
        <form className="card space-y-4" method="get">
          <div>
            <label className="label">Bacenta</label>
            <select name="bacenta" className="input" required defaultValue="">
              <option value="" disabled>
                Select bacenta
              </option>
              {scoped.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.governorshipName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Service date</label>
            <input name="date" type="date" className="input" defaultValue={serviceDate} />
          </div>
          <button className="btn">Continue</button>
        </form>
      </div>
    );
  }

  const bacenta = scoped.find((b) => b.id === bacentaId)!;
  const roll = await db
    .select()
    .from(members)
    .where(inArray(members.bacentaId, [bacentaId]))
    .orderBy(members.firstName, members.lastName);

  // Preload existing entries for edit-in-place
  const existingDay = await db.query.serviceAttendanceDays.findFirst({
    where: and(
      eq(serviceAttendanceDays.bacentaId, bacentaId),
      eq(serviceAttendanceDays.serviceDate, serviceDate),
    ),
  });
  const existingEntries = existingDay
    ? await db
        .select()
        .from(serviceAttendanceEntries)
        .where(eq(serviceAttendanceEntries.dayId, existingDay.id))
    : [];
  const entryByMember = new Map(existingEntries.map((e) => [e.memberId, e]));

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">
          {bacenta.name} — attendance
        </h1>
        <p className="text-sm text-zinc-400">
          Service date {serviceDate}
          {existingDay ? " · editing existing record" : ""}
        </p>
      </div>

      <form action={saveAttendanceAction} className="space-y-4">
        <input type="hidden" name="bacentaId" value={bacentaId} />
        <input type="hidden" name="serviceDate" value={serviceDate} />

        <div className="card divide-y divide-zinc-800 p-0">
          {roll.length === 0 ? (
            <p className="p-4 text-sm text-zinc-500">
              No members in this bacenta yet.
            </p>
          ) : (
            roll.map((m) => {
              const prev = entryByMember.get(m.id);
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                  <input type="hidden" name="memberIds" value={m.id} />
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name={`present_${m.id}`}
                      defaultChecked={prev?.present ?? false}
                      className="h-5 w-5 accent-emerald-500"
                    />
                    <span className="text-sm">
                      {m.firstName} {m.lastName}
                    </span>
                  </label>
                  <input
                    name={`remarks_${m.id}`}
                    defaultValue={prev?.remarks ?? ""}
                    placeholder="remarks"
                    className="input max-w-36 py-1 text-xs"
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="card flex items-center gap-3">
          <label className="label mb-0">Visitors / first-timers</label>
          <input
            name="visitorCount"
            type="number"
            min={0}
            defaultValue={existingDay?.visitorCount ?? 0}
            className="input max-w-24"
          />
        </div>

        <button className="btn w-full sm:w-auto">
          {existingDay ? "Update attendance" : "Submit attendance"}
        </button>
      </form>
    </div>
  );
}
