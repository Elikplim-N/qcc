import Link from "next/link";
import { eq } from "drizzle-orm";

import { db, bacentas, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { MemberCard } from "@qcc/ui/components/member-card";

export default async function BacentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const leader = await requireLeader();

  const isChief = leader.role === "chief_admin";
  if (!isChief) {
    return <p className="card text-sm text-zinc-400">Only chief admin can view this.</p>;
  }

  const bacenta = await db.query.bacentas.findFirst({
    where: eq(bacentas.id, id),
  });

  if (!bacenta) {
    return <p className="card text-sm text-zinc-400">Bacenta not found.</p>;
  }

  const bacentaMembers = await db
    .select()
    .from(members)
    .where(eq(members.bacentaId, id))
    .orderBy(members.firstName);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hierarchy" className="text-indigo-400 hover:underline text-sm mb-2 block">
          ← Back to Governorships
        </Link>
        <h1 className="text-xl font-bold">{bacenta.name}</h1>
        <p className="text-sm text-zinc-400">Members ({bacentaMembers.length})</p>
      </div>

      {bacentaMembers.length === 0 ? (
        <div className="empty-state card">
          <p>No members in this bacenta.</p>
        </div>
      ) : (
        <div className="sm:grid sm:grid-cols-2 sm:gap-3 md:grid-cols-3 xl:grid-cols-4">
          {bacentaMembers.map((m) => (
            <MemberCard key={m.id} member={m} href={`/members/${m.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
