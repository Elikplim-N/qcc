import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db, members } from "@qcc/db";

export default async function RegisterSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await db.query.members.findFirst({
    where: eq(members.id, id),
  });

  if (!member) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="card space-y-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-950 mx-auto">
            <svg
              className="h-8 w-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">Welcome!</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your profile has been created successfully.
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900 p-4 text-left space-y-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-500">Your Member Code</p>
              <p className="text-lg font-mono font-bold text-zinc-100">{member.memberCode}</p>
            </div>
            <p className="text-xs text-zinc-500">
              Please keep this code safe. You may need it for future reference or leadership.
            </p>
          </div>

          <div className="space-y-2 text-sm text-zinc-400">
            <p>Name: <span className="text-white">{member.firstName} {member.lastName}</span></p>
            <p>Phone: <span className="text-white">{member.phoneNumber}</span></p>
          </div>

          <div className="space-y-3 pt-4">
            <p className="text-xs text-zinc-500">
              A leader from your fellowship will review your profile and confirm your membership.
            </p>
            <Link href="/login" className="btn block text-center">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
