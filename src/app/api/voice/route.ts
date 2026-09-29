import { NextResponse } from "next/server";
import { currentMember } from "@/lib/auth";
import { VOICE_MAX_BYTES } from "@/lib/config";
import { sql } from "@/lib/db";

const ALLOWED = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/aac", "audio/x-m4a", "audio/wav"];

export async function POST(req: Request) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  if (!me.idVerifiedAt) return NextResponse.json({ error: "Verify your identity first" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No recording received" }, { status: 400 });
  const mime = file.type.split(";")[0];
  if (!ALLOWED.includes(mime)) return NextResponse.json({ error: "Unsupported audio format" }, { status: 415 });
  if (file.size === 0 || file.size > VOICE_MAX_BYTES) {
    return NextResponse.json({ error: "Recordings must be 30 seconds or less" }, { status: 413 });
  }
  const audio = Buffer.from(await file.arrayBuffer());
  await sql`
    insert into voice_intros (member_id, mime, audio) values (${me.id}, ${mime}, ${audio})
    on conflict (member_id) do update set mime = excluded.mime, audio = excluded.audio, created_at = now()`;
  await sql`update members set voice_done_at = now() where id = ${me.id}`;
  return NextResponse.json({ ok: true });
}
