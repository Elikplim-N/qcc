import webpush from "web-push";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db, auditLogs, leaders, members, pushSubscriptions } from "@qcc/db";

const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";

let vapidConfigured = false;
function ensureVapidConfigured() {
  if (vapidConfigured) return;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set.");
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Save (or refresh) a browser's push subscription for a leader. One row per
 * device/browser — re-subscribing the same endpoint just updates the keys. */
export async function savePushSubscription(leaderId: string, sub: PushSubscriptionJSON) {
  await db
    .insert(pushSubscriptions)
    .values({
      leaderId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { leaderId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

export async function removePushSubscription(endpoint: string) {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function hasPushSubscription(leaderId: string): Promise<boolean> {
  const row = await db.query.pushSubscriptions.findFirst({
    where: eq(pushSubscriptions.leaderId, leaderId),
  });
  return !!row;
}

async function sendToSubscription(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: string,
): Promise<boolean> {
  ensureVapidConfigured();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    );
    return true;
  } catch (err: unknown) {
    // 404/410 = the browser dropped the subscription (uninstalled, cleared
    // permissions, etc.) — clean up the dead row so we stop retrying it.
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    }
    return false;
  }
}

export async function sendPushToLeader(
  leaderId: string,
  title: string,
  body: string,
  url = "/",
): Promise<void> {
  const subs = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.leaderId, leaderId),
  });
  if (subs.length === 0) return;
  const payload = JSON.stringify({ title, body, url });
  await Promise.all(subs.map((s) => sendToSubscription(s, payload)));
}

// Sarcastic, Duolingo-style nudges. Nobody is actually getting fired —
// it's a joke, and it rotates so it doesn't go stale.
const NUDGE_MESSAGES = [
  "Your members haven't heard from their leader today. Awkward.",
  "Still no check-in today. Somewhere, a bacenta is wondering if you quit.",
  "The last leader who ignored this app for a week isn't a leader anymore. Just saying — go check on your people.",
  "This is your bacenta's cry for attention. Open the app.",
  "Zero activity today. Your members are shepherd-less right now.",
  "A gentle reminder that \"leader\" is a verb, not a title. Go check in.",
  "Somebody has to notice if a member's struggling. Today, that's you — and you haven't logged in.",
  "Your dashboard is lonely. So, probably, are some of your members.",
  "We won't say who, but someone on your team checked in today and it wasn't you.",
  "Attendance doesn't record itself. Neither does caring, technically, but you get the idea.",
];

function pickNudgeMessage(): string {
  return NUDGE_MESSAGES[Math.floor(Math.random() * NUDGE_MESSAGES.length)];
}

// Roles expected to actively "check on" members day to day. chief_admin and
// the arrivals-only roles are deliberately excluded — the message wouldn't
// make sense for them.
const NUDGEABLE_ROLES = ["bacenta_leader", "governor", "council_leader"] as const;

export type NudgeCandidate = { id: string; fullName: string };

/** Leaders who (a) have push enabled and (b) have no recorded activity
 * (any audit-logged action) yet today. */
export async function findLeadersNeedingNudge(): Promise<NudgeCandidate[]> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const candidates = await db
    .selectDistinctOn([leaders.id], {
      id: leaders.id,
      fullName: sql<string>`${members.firstName} || ' ' || ${members.lastName}`,
    })
    .from(leaders)
    .innerJoin(members, eq(leaders.memberId, members.id))
    .innerJoin(pushSubscriptions, eq(pushSubscriptions.leaderId, leaders.id))
    .where(and(eq(leaders.isActive, true), inArray(leaders.role, NUDGEABLE_ROLES)));

  if (candidates.length === 0) return [];

  const activeToday = await db
    .selectDistinct({ leaderId: auditLogs.actorLeaderId })
    .from(auditLogs)
    .where(gte(auditLogs.createdAt, startOfToday));
  const activeSet = new Set(activeToday.map((r) => r.leaderId).filter((id): id is string => !!id));

  return candidates.filter((c) => !activeSet.has(c.id));
}

/** Send today's nudge to every leader who needs one. Called by the daily
 * cron job (see apps/synago's /api/cron/nudge route). */
export async function runDailyNudge(): Promise<{ nudged: number; names: string[] }> {
  const targets = await findLeadersNeedingNudge();
  await Promise.all(
    targets.map((t) => sendPushToLeader(t.id, "Poimen", pickNudgeMessage(), "/")),
  );
  return { nudged: targets.length, names: targets.map((t) => t.fullName) };
}
