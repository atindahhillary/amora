import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { dateReminders, expireConversations } from "@/lib/services/conversations";
import { notifyDrops } from "@/lib/services/drops";

// Call every 15 minutes (e.g. Vercel Cron, which sends Authorization: Bearer $CRON_SECRET).
export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const given = req.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const [expired, reminders, notified] = [await expireConversations(), await dateReminders(), await notifyDrops()];
  return NextResponse.json({ expired, reminders, notified });
}
