import { NextResponse } from "next/server";
import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [p] = await sql<{ status: string }[]>`select status from payments where id = ${id} and member_id = ${me.id}`;
  if (!p) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ status: p.status });
}
