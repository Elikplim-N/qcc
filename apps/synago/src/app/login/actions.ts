"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db, leaders } from "@qcc/db";
import { createSession } from "@qcc/core/auth";
import { verifyPassword } from "@qcc/core/password";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "Enter your username and password." };
  }

  const leader = await db.query.leaders.findFirst({
    where: eq(leaders.username, username),
  });
  if (!leader || !leader.isActive || !verifyPassword(password, leader.passwordHash)) {
    return { error: "Invalid username or password." };
  }

  await createSession(leader.id);
  redirect("/");
}
