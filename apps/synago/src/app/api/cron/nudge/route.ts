import { NextRequest, NextResponse } from "next/server";

import { runDailyNudge } from "@qcc/core/notifications";

// Fired daily by Vercel Cron (see vercel.json). Sends the sarcastic
// "you haven't checked on your members today" push to every leader who has
// notifications enabled and no recorded activity yet today.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyNudge();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Daily nudge failed:", error);
    return NextResponse.json({ error: "Failed to run daily nudge" }, { status: 500 });
  }
}
