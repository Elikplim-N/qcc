import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db, onTheWaySubmissions } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canApproveArrivals, canEnterCounterCount } from "@qcc/core/permissions";
import { getBacentaScope } from "@qcc/core/scope";
import { cediFromPesewas, formatDate, formatDateTime } from "@qcc/core/week";
import { StatusBadge } from "@qcc/ui/components/status-badge";
import { reviewOnTheWayAction, saveCounterCountsAction } from "../../actions";

export default async function ReviewSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leader = await requireLeader();

  const sub = await db.query.onTheWaySubmissions.findFirst({
    where: eq(onTheWaySubmissions.id, id),
  });
  if (!sub) notFound();
  const scope = await getBacentaScope(sub.bacentaId);
  if (!scope) notFound();

  const mayApprove = canApproveArrivals(leader, scope);
  const mayCount = canEnterCounterCount(leader);
  if (!mayApprove && !mayCount) {
    return <p className="card text-sm text-zinc-400">Outside your scope.</p>;
  }

  const decided = sub.status !== "submitted";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{scope.name}</h1>
          <p className="text-sm text-zinc-400">
            On-the-Way · week of {formatDate(sub.weekOf)}
          </p>
        </div>
        <StatusBadge value={sub.status} />
      </div>

      <div className="card grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <div className="text-xs uppercase text-zinc-500">Members</div>
          <div className="text-lg font-bold">{sub.reportedMembers}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">Visitors</div>
          <div className="text-lg font-bold">{sub.reportedVisitors}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">Cost</div>
          <div className="text-lg font-bold">{cediFromPesewas(sub.costPesewas)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-zinc-500">MoMo</div>
          <div className="text-lg font-bold">{sub.momoNumber ?? "—"}</div>
        </div>
      </div>

      {scope.momoNumber && scope.momoNumber !== sub.momoNumber ? (
        <p className="card border-amber-900 text-xs text-amber-400">
          Note: the bacenta&apos;s saved MoMo number ({scope.momoNumber},{" "}
          {scope.momoName ?? "no name"}, {scope.mobileNetwork ?? "network n/a"})
          differs from the one on this submission.
        </p>
      ) : null}

      <form
        action={mayApprove && !decided ? reviewOnTheWayAction : saveCounterCountsAction}
        className="space-y-4"
      >
        <input type="hidden" name="id" value={sub.id} />

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Vehicles — enter physical counts
          </h2>
          {sub.vehicles.map((v, i) => (
            <div
              key={i}
              className="grid grid-cols-2 items-end gap-3 rounded-lg border border-zinc-800 p-3 sm:grid-cols-4"
            >
              <div>
                <div className="text-xs uppercase text-zinc-500">{v.type}</div>
                <div className="text-sm">
                  Leader: <span className="font-bold">{v.leaderCount}</span>
                </div>
              </div>
              <div>
                <label className="label">Counter count</label>
                <input
                  name={`counterCount_${i}`}
                  type="number"
                  min={0}
                  defaultValue={v.counterCount ?? ""}
                  className="input"
                  disabled={decided}
                />
              </div>
              <div>
                <label className="label">Trip type</label>
                <select
                  name={`inAndOut_${i}`}
                  defaultValue={v.inAndOut ?? ""}
                  className="input"
                  disabled={decided}
                >
                  <option value="">—</option>
                  <option value="in_and_out">In & out</option>
                  <option value="only_in">Only in</option>
                </select>
              </div>
              <div>
                <label className="label">Top-up (GH₵)</label>
                <input
                  name={`topUp_${i}`}
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={v.topUp ?? ""}
                  className="input"
                  disabled={decided}
                />
              </div>
            </div>
          ))}
        </div>

        {!decided && mayApprove ? (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
              Adjust reported figures (optional)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Members</label>
                <input
                  name="reportedMembers"
                  type="number"
                  min={0}
                  defaultValue={sub.reportedMembers}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Visitors</label>
                <input
                  name="reportedVisitors"
                  type="number"
                  min={0}
                  defaultValue={sub.reportedVisitors}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Review notes</label>
              <textarea name="reviewNotes" rows={2} className="input" />
            </div>
            <div className="flex gap-3">
              <button name="decision" value="approved" className="btn">
                Approve arrival
              </button>
              <button name="decision" value="rejected" className="btn-danger">
                Reject
              </button>
            </div>
          </div>
        ) : !decided && mayCount ? (
          <button className="btn">Save counter counts</button>
        ) : (
          <div className="card text-sm text-zinc-400">
            Reviewed {formatDateTime(sub.reviewedAt)}
            {sub.arrivedAt ? ` · arrived ${formatDateTime(sub.arrivedAt)}` : ""}
            {sub.reviewNotes ? ` · "${sub.reviewNotes}"` : ""}
          </div>
        )}
      </form>
    </div>
  );
}
