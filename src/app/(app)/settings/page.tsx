import { eq } from "drizzle-orm";

import { db, settings } from "@/db";
import { requireLeader } from "@/lib/auth";
import { canManageArrivalsSettings } from "@/lib/permissions";
import { updateSettingAction } from "./actions";

export default async function SettingsPage() {
  const leader = await requireLeader();
  if (!canManageArrivalsSettings(leader)) {
    return <p className="card text-sm text-zinc-400">Outside your role.</p>;
  }

  const code = await db.query.settings.findFirst({
    where: eq(settings.key, "code_of_the_day"),
  });

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold">Arrivals settings</h1>
      <form action={updateSettingAction} className="card space-y-3">
        <input type="hidden" name="key" value="code_of_the_day" />
        <div>
          <label className="label">Code of the day</label>
          <input
            name="value"
            className="input"
            defaultValue={code?.value ?? ""}
            placeholder="e.g. FIRE-2026"
            required
          />
          <p className="mt-1 text-xs text-zinc-500">
            Shown to bacenta leaders on the Pre-Mobilisation form; their proof
            photo must display it. It is stamped onto each submission.
          </p>
        </div>
        <button className="btn">Save</button>
      </form>
      <p className="text-xs text-zinc-500">
        Arrivals Counters are assigned on the{" "}
        <a href="/manage/leaders" className="underline">
          Leaders & roles
        </a>{" "}
        page (Chief Admin) by promoting an existing member to the Arrivals
        Counter role.
      </p>
    </div>
  );
}
