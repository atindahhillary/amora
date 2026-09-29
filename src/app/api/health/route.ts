import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Uptime check: confirms the app can reach the database. Reveals nothing else.
export async function GET() {
  try {
    await sql`select 1`;
    return NextResponse.json({ ok: true, db: true });
  } catch (err) {
    console.error("health check failed", err);
    return NextResponse.json({ ok: false, db: false }, { status: 503 });
  }
}
