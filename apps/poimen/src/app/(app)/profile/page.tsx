import Link from "next/link";
import { eq } from "drizzle-orm";

import { db, members } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { bacentaLeaderTitle, ROLE_LABELS } from "@qcc/core/permissions";
import { AccountForm } from "@qcc/ui/components/account-form";
import { PushOptIn } from "@qcc/ui/components/push-opt-in";
import {
  updateAccountAction,
  savePushSubscriptionAction,
  removePushSubscriptionAction,
} from "./actions";

export default async function ProfilePage() {
  const leader = await requireLeader();
  const member = leader.memberId
    ? await db.query.members.findFirst({ where: eq(members.id, leader.memberId) })
    : null;

  const roleLabel =
    leader.role === "bacenta_leader"
      ? bacentaLeaderTitle(leader.area)
      : ROLE_LABELS[leader.role];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>

      <div className="card flex max-w-2xl items-center gap-4">
        {member?.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photoUrl}
            alt=""
            className="h-16 w-16 rounded-full border border-zinc-700 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-lg font-semibold text-zinc-400">
            {leader.fullName
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-white">{leader.fullName}</p>
          <p className="text-sm text-zinc-400">{roleLabel}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Username: <span className="font-mono text-zinc-300">{leader.username}</span>
          </p>
        </div>
        {member ? (
          <Link href={`/members/${member.id}/edit`} className="btn-secondary shrink-0">
            Edit details
          </Link>
        ) : null}
      </div>

      <AccountForm action={updateAccountAction} username={leader.username} />

      <PushOptIn
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
        subscribeAction={savePushSubscriptionAction}
        unsubscribeAction={removePushSubscriptionAction}
      />
    </div>
  );
}
