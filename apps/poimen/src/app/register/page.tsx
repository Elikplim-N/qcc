import { eq } from "drizzle-orm";
import { db, bacentas, governorships } from "@qcc/db";
import { PublicMemberForm } from "./public-member-form";
import { publicRegisterMemberAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const bacentaList = await db
    .select({
      id: bacentas.id,
      name: bacentas.name,
      area: bacentas.area,
      governorshipName: governorships.name,
    })
    .from(bacentas)
    .leftJoin(governorships, eq(bacentas.governorshipId, governorships.id))
    .orderBy(bacentas.name);

  const scopedBacentas = bacentaList.map((b) => ({
    id: b.id,
    name: b.name,
    area: b.area as "area1" | "area2",
    governorshipName: b.governorshipName || "Unknown",
  }));

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Join Our Fellowship</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Create your member profile to get started
          </p>
        </div>

        <PublicMemberForm
          action={publicRegisterMemberAction}
          bacentas={scopedBacentas}
          submitLabel="Create Profile"
        />

        <p className="mt-6 text-center text-xs text-zinc-600">
          Already registered?{" "}
          <a href="/login" className="text-blue-400 hover:underline">
            Log in here
          </a>
        </p>
      </div>
    </div>
  );
}
