import Link from "next/link";
import { eq } from "drizzle-orm";

import { db, governorships, councils } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";

export default async function GovernorshipsPage() {
  const leader = await requireLeader();

  const isChief = leader.role === "chief_admin";
  if (!isChief) {
    return <p className="card text-sm text-zinc-400">Only chief admin can view all governorships.</p>;
  }

  const allGovs = await db
    .select()
    .from(governorships)
    .orderBy(governorships.name);

  const councils_ = await db.select().from(councils);
  const councilById = new Map(councils_.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Governorships</h1>
        <p className="text-sm text-zinc-400">Browse all governorships</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3 font-semibold">Governorship</th>
              <th className="px-4 py-3 font-semibold">Council</th>
              <th className="px-4 py-3 font-semibold">Area</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {allGovs.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                  No governorships found.
                </td>
              </tr>
            ) : (
              allGovs.map((gov) => (
                <tr key={gov.id} className="hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <Link href={`/hierarchy/governorships/${gov.id}`} className="text-indigo-400 hover:underline font-medium">
                      {gov.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{councilById.get(gov.councilId)?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${gov.area === "area1" ? "bg-violet-950 text-violet-300" : "bg-amber-950 text-amber-300"}`}>
                      {gov.area === "area1" ? "Area 1" : "Area 2"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
