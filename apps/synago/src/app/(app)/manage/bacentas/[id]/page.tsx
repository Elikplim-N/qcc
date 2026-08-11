import { notFound } from "next/navigation";

import { requireLeader } from "@qcc/core/auth";
import { canCreateBacenta } from "@qcc/core/permissions";
import { getBacentaScope } from "@qcc/core/scope";
import { SubmitButton } from "@qcc/ui/components/submit-button";
import { updateBacentaAction } from "../../actions";

export default async function EditBacentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leader = await requireLeader();
  const scope = await getBacentaScope(id);
  if (!scope) notFound();
  if (
    !canCreateBacenta(leader, {
      governorshipId: scope.governorshipId,
      councilId: scope.councilId,
    })
  ) {
    return <p className="card text-sm text-zinc-400">Outside your scope.</p>;
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-bold">Edit bacenta</h1>
      <form action={updateBacentaAction} className="card space-y-4">
        <input type="hidden" name="bacentaId" value={scope.id} />
        <div>
          <label className="label">Name</label>
          <input name="name" className="input" defaultValue={scope.name} required />
        </div>
        <div>
          <label className="label">Area</label>
          <select name="area" className="input" defaultValue={scope.area}>
            <option value="area1">Area 1 (in person)</option>
            <option value="area2">Area 2 (bussed)</option>
          </select>
        </div>
        <fieldset className="space-y-3 rounded-lg border border-zinc-800 p-3">
          <legend className="px-1 text-xs uppercase tracking-wide text-zinc-500">
            Bussing bank details (Area 2)
          </legend>
          <div>
            <label className="label">MoMo number</label>
            <input name="momoNumber" className="input" defaultValue={scope.momoNumber ?? ""} />
          </div>
          <div>
            <label className="label">MoMo name</label>
            <input name="momoName" className="input" defaultValue={scope.momoName ?? ""} />
          </div>
          <div>
            <label className="label">Network</label>
            <select
              name="mobileNetwork"
              className="input"
              defaultValue={scope.mobileNetwork ?? ""}
            >
              <option value="">—</option>
              <option value="MTN">MTN</option>
              <option value="Telecel">Telecel</option>
              <option value="AT">AT</option>
            </select>
          </div>
        </fieldset>
        <SubmitButton>Save</SubmitButton>
      </form>
    </div>
  );
}
