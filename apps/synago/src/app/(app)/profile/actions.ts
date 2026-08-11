"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db, leaders } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { hashPassword } from "@qcc/core/password";
import { logAudit } from "@qcc/core/scope";
import { savePushSubscription, removePushSubscription, type PushSubscriptionJSON } from "@qcc/core/notifications";

export async function savePushSubscriptionAction(sub: PushSubscriptionJSON) {
  const leader = await requireLeader();
  await savePushSubscription(leader.id, sub);
}

export async function removePushSubscriptionAction(endpoint: string) {
  await requireLeader();
  await removePushSubscription(endpoint);
}

export async function updateAccountAction(formData: FormData) {
  const leader = await requireLeader();
  const newUsername = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newUsername && newUsername.length < 3) {
    throw new Error("Username must be at least 3 characters.");
  }
  if (password && password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if ((password || confirmPassword) && password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const updates: Partial<{ username: string; passwordHash: string }> = {};

  if (newUsername && newUsername !== leader.username) {
    const existing = await db.query.leaders.findFirst({
      where: eq(leaders.username, newUsername),
    });
    if (existing) throw new Error("This username is already taken.");
    updates.username = newUsername;
  }
  if (password) {
    updates.passwordHash = hashPassword(password);
  }

  if (Object.keys(updates).length > 0) {
    await db.update(leaders).set(updates).where(eq(leaders.id, leader.id));
    await logAudit("account_updated", leader.id, "leader", leader.id);
  }

  revalidatePath("/profile");
  redirect("/profile");
}
