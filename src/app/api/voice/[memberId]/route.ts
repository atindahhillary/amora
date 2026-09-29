import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";

// A voice intro can be played by its owner, a matchmaker, or someone in a
// conversation with its owner. Match cards never include it: the swap is
// the first stage of a conversation.
export async function GET(_: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const me = await currentMember();
  if (!me) return new Response("unauthorised", { status: 401 });
  const { memberId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(memberId)) return new Response("not found", { status: 404 });

  if (me.id !== memberId && me.role !== "admin") {
    const [allowed] = await sql`
      select 1 from conversations c join matches m on m.id = c.match_id
      where (m.member_a = ${me.id} and m.member_b = ${memberId}) or (m.member_b = ${me.id} and m.member_a = ${memberId})`;
    if (!allowed) return new Response("not found", { status: 404 });
  }
  const [v] = await sql<{ mime: string; audio: Buffer }[]>`select mime, audio from voice_intros where member_id = ${memberId}`;
  if (!v) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(v.audio), {
    headers: { "Content-Type": v.mime, "Cache-Control": "private, no-store" },
  });
}
