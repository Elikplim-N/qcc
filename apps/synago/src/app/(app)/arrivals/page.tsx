import { and, eq } from "drizzle-orm";

import { db, onTheWaySubmissions, premobilisations, settings } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canSubmitArrivals, showsBussingUi } from "@qcc/core/permissions";
import { getBacentaScope } from "@qcc/core/scope";
import { cediFromPesewas, formatDate, serviceWeekOf } from "@qcc/core/week";
import { PhotoInput } from "@qcc/ui/components/photo-input";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { submitOnTheWayAction, submitPremobAction } from "./actions";
import { VehiclesInput } from "./vehicles-input";

// Main arrivals submission form for bacenta leaders
// Stage 1: Pre-Mobilisation (both areas) — proof photo + count
// Stage 2: On-the-Way (Area 2 only) — members, vehicles, cost, MoMo
export default async function ArrivalsPage() {
  const leader = await requireLeader();
  if (!canSubmitArrivals(leader) || !leader.bacentaId) {
    return (
      <p className="card text-sm text-zinc-400">
        Arrivals submissions are made by bacenta leaders. Use the Monitor page
        instead.
      </p>
    );
  }

  const weekOf = serviceWeekOf();
  const bacenta = await getBacentaScope(leader.bacentaId);
  const isArea2 = showsBussingUi(leader);

  const [premob, otw, code] = await Promise.all([
    db.query.premobilisations.findFirst({
      where: and(
        eq(premobilisations.bacentaId, leader.bacentaId),
        eq(premobilisations.weekOf, weekOf),
      ),
    }),
    isArea2
      ? db.query.onTheWaySubmissions.findFirst({
          where: and(
            eq(onTheWaySubmissions.bacentaId, leader.bacentaId),
            eq(onTheWaySubmissions.weekOf, weekOf),
          ),
        })
      : Promise.resolve(undefined),
    db.query.settings.findFirst({ where: eq(settings.key, "code_of_the_day") }),
  ]);

  const otwLocked = otw?.status === "approved";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Arrivals — {bacenta?.name}</h1>
        <p className="text-sm text-zinc-400">
          Service week of {formatDate(weekOf)}
          {isArea2 ? " · Area 2 (bussing)" : " · Area 1 (in person)"}
        </p>
      </div>

      {/* Stage 1 — Pre-Mobilisation */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            1 · Pre-Mobilisation{" "}
            {!isArea2 ? (
              <span className="text-xs font-normal text-zinc-500">
                (completes your arrivals flow)
              </span>
            ) : null}
          </h2>
          {premob ? (
            <span className="badge border border-emerald-900 bg-emerald-950 text-emerald-300">
              Submitted ✓
            </span>
          ) : (
            <span className="badge border border-amber-900 bg-amber-950 text-amber-300">
              Pending
            </span>
          )}
        </div>
        {code?.value ? (
          <p className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            Code of the day: <span className="font-bold">{code.value}</span> —
            your photo must show it.
          </p>
        ) : null}
        {premob ? (
          <div className="flex items-center gap-4 text-sm text-zinc-300">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={premob.photoUrl}
              alt="pre-mob proof"
              className="h-16 w-16 rounded-lg border border-zinc-700 object-cover"
            />
            <div>
              <div>{premob.attendanceCount} people mobilised</div>
              <div className="text-xs text-zinc-500">
                Submitted — you can resubmit below to replace it.
              </div>
            </div>
          </div>
        ) : null}
        <form action={submitPremobAction} className="space-y-4">
          <PhotoInput name="photoUrl" required label="Proof photo (code of the day)" />
          <div>
            <label className="label">Attendance count</label>
            <input
              name="attendanceCount"
              type="number"
              min={0}
              defaultValue={premob?.attendanceCount ?? ""}
              className="input max-w-32"
              required
            />
          </div>
          <button className="btn">
            {premob ? "Resubmit Pre-Mobilisation" : "Submit Pre-Mobilisation"}
          </button>
        </form>
      </section>

      {/* Stage 2 — On-the-Way (Area 2 only) */}
      {isArea2 ? (
        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">2 · On-the-Way</h2>
            {otw ? <StatusBadge value={otw.status} /> : null}
          </div>

          {!premob ? (
            <p className="text-sm text-amber-400">
              Submit Pre-Mobilisation first — On-the-Way unlocks after it.
            </p>
          ) : otwLocked ? (
            <div className="space-y-1 text-sm text-zinc-300">
              <p className="text-emerald-400">
                Approved and locked — {otw!.reportedMembers} members +{" "}
                {otw!.reportedVisitors} visitors, {cediFromPesewas(otw!.costPesewas)}.
              </p>
              {otw!.reviewNotes ? (
                <p className="text-xs text-zinc-500">Note: {otw!.reviewNotes}</p>
              ) : null}
            </div>
          ) : (
            <form action={submitOnTheWayAction} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Members on board</label>
                  <input
                    name="reportedMembers"
                    type="number"
                    min={0}
                    defaultValue={otw?.reportedMembers ?? ""}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Visitors on board</label>
                  <input
                    name="reportedVisitors"
                    type="number"
                    min={0}
                    defaultValue={otw?.reportedVisitors ?? 0}
                    className="input"
                  />
                </div>
              </div>
              <VehiclesInput
                initial={otw?.vehicles?.map((v) => ({
                  type: v.type,
                  leaderCount: v.leaderCount,
                }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Total cost (GH₵)</label>
                  <input
                    name="costCedis"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={otw ? (otw.costPesewas / 100).toFixed(2) : ""}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">MoMo number</label>
                  <input
                    name="momoNumber"
                    defaultValue={otw?.momoNumber ?? bacenta?.momoNumber ?? ""}
                    className="input"
                  />
                </div>
              </div>
              <button className="btn">
                {otw ? "Resubmit On-the-Way" : "Submit On-the-Way"}
              </button>
            </form>
          )}
        </section>
      ) : null}
    </div>
  );
}
