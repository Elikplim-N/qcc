import { and, eq, inArray } from "drizzle-orm";
import Link from "next/link";

import {
  db,
  members,
  serviceAttendanceDays,
  serviceAttendanceEntries,
  fellowshipAttendanceDays,
  fellowshipAttendanceEntries,
} from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { getScopedBacentas } from "@qcc/core/scope";
import { serviceWeekOf } from "@qcc/core/week";
import { SubmitButton } from "@qcc/ui/components/submit-button";
import { saveServiceAttendanceAction, saveFellowshipAttendanceAction } from "../actions";

export default async function RecordAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; bacenta?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const type = sp.type === "fellowship" ? "fellowship" : "service";
  const isService = type === "service";

  const leader = await requireLeader();
  const scoped = await getScopedBacentas(leader);

  if (scoped.length === 0) {
    return (
      <div className="card text-sm text-zinc-400 p-6 flex flex-col items-center justify-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 mb-2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="font-semibold text-zinc-300">No bacentas in scope</p>
        <p className="text-xs text-zinc-500 mt-1">You must oversee at least one bacenta to record attendance.</p>
      </div>
    );
  }

  const bacentaId =
    sp.bacenta && scoped.some((b) => b.id === sp.bacenta)
      ? sp.bacenta
      : scoped.length === 1
        ? scoped[0].id
        : null;

  const defaultDate = isService ? serviceWeekOf() : new Date().toISOString().split("T")[0];
  const selectedDate = sp.date ?? defaultDate;

  // Step 1: Choose bacenta and date
  if (!bacentaId) {
    return (
      <div className="max-w-md space-y-4 animate-[slide-up_0.2s_ease-out]">
        <div className="flex items-center gap-2">
          <Link href="/attendance" className="text-zinc-500 hover:text-zinc-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Record {isService ? "Service" : "Fellowship"} Attendance
          </h1>
        </div>

        <form className="card space-y-4" method="get">
          <input type="hidden" name="type" value={type} />
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
            <label className="label">{isService ? "Service Date" : "Fellowship Date"}</label>
            <input name="date" type="date" className="input" defaultValue={selectedDate} />
          </div>
          <SubmitButton pendingLabel="Loading…">Continue</SubmitButton>
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
  let existingDay = null;
  let existingEntries: any[] = [];

  if (isService) {
    existingDay = await db.query.serviceAttendanceDays.findFirst({
      where: and(
        eq(serviceAttendanceDays.bacentaId, bacentaId),
        eq(serviceAttendanceDays.serviceDate, selectedDate),
      ),
    });
    existingEntries = existingDay
      ? await db
          .select()
          .from(serviceAttendanceEntries)
          .where(eq(serviceAttendanceEntries.dayId, existingDay.id))
      : [];
  } else {
    existingDay = await db.query.fellowshipAttendanceDays.findFirst({
      where: and(
        eq(fellowshipAttendanceDays.bacentaId, bacentaId),
        eq(fellowshipAttendanceDays.attendanceDate, selectedDate),
      ),
    });
    existingEntries = existingDay
      ? await db
          .select()
          .from(fellowshipAttendanceEntries)
          .where(eq(fellowshipAttendanceEntries.dayId, existingDay.id))
      : [];
  }

  const entryByMember = new Map(existingEntries.map((e) => [e.memberId, e]));

  return (
    <div className="max-w-2xl space-y-6 animate-[slide-up_0.2s_ease-out]">
      <div className="flex items-center gap-3">
        <Link href={`/attendance?type=${type}`} className="text-zinc-500 hover:text-zinc-300">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            {bacenta.name} — {isService ? "Service" : "Fellowship"} Attendance
          </h1>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            Date: {selectedDate} {existingDay ? "· Editing existing record" : ""}
          </p>
        </div>
      </div>

      <form action={isService ? saveServiceAttendanceAction : saveFellowshipAttendanceAction} className="space-y-4">
        <input type="hidden" name="bacentaId" value={bacentaId} />
        {isService ? (
          <input type="hidden" name="serviceDate" value={selectedDate} />
        ) : (
          <input type="hidden" name="attendanceDate" value={selectedDate} />
        )}

        <div className="card divide-y divide-zinc-800/60 p-0 overflow-hidden">
          {roll.length === 0 ? (
            <div className="empty-state p-6">
              <p className="font-semibold text-zinc-400">No members in this bacenta yet</p>
              <p className="text-xs text-zinc-500 mt-0.5">Add members in the directory before marking attendance.</p>
            </div>
          ) : (
            roll.map((m) => {
              const prev = entryByMember.get(m.id);
              return (
                <div key={m.id} className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-900/30 transition-all">
                  <input type="hidden" name="memberIds" value={m.id} />
                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name={`present_${m.id}`}
                      defaultChecked={prev?.present ?? false}
                      className="h-5 w-5 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-2 focus:ring-indigo-500/30 transition duration-150"
                    />
                    <span className="text-sm font-medium text-zinc-200">
                      {m.firstName} {m.lastName}
                    </span>
                  </label>
                  <input
                    name={`remarks_${m.id}`}
                    defaultValue={prev?.remarks ?? ""}
                    placeholder="add remark..."
                    className="input max-w-44 py-1 text-xs"
                  />
                </div>
              );
            })
          )}
        </div>

        <div className="card flex items-center gap-4 py-3.5 border-zinc-800/80">
          <label className="label mb-0 font-bold text-zinc-300">Visitors / first-timers</label>
          <input
            name="visitorCount"
            type="number"
            min={0}
            defaultValue={existingDay?.visitorCount ?? 0}
            className="input max-w-28 text-center"
          />
        </div>

        <SubmitButton
          className="btn w-full sm:w-auto font-bold py-2.5 px-6"
          pendingLabel="Submitting…"
        >
          {existingDay ? "Update attendance" : "Submit attendance"}
        </SubmitButton>
      </form>
    </div>
  );
}
