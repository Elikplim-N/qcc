"use server";

import { revalidatePath } from "next/cache";

import { db, settings } from "@qcc/db";
import { requireLeader } from "@qcc/core/auth";
import { canManageArrivalsSettings } from "@qcc/core/permissions";
import { logAudit } from "@qcc/core/scope";

export async function updateSettingAction(formData: FormData) {
  const leader = await requireLeader();
  if (!canManageArrivalsSettings(leader)) {
    throw new Error("You cannot change arrivals settings.");
  }
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!key || !value) throw new Error("Missing key or value.");

  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: new Date() },
    });

  await logAudit("setting_updated", leader.id, "setting", key);
  revalidatePath("/settings");
  revalidatePath("/arrivals");
}
