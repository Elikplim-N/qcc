"use server";

import { redirect } from "next/navigation";

import { destroySession } from "@qcc/core/auth";

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
