import { currentMember } from "@/lib/auth";
import { sql } from "@/lib/db";

// Data subject access: everything tied to this member, except other people's data.
export async function GET() {
  const me = await currentMember();
  if (!me) return new Response("unauthorised", { status: 401 });
  const [answers, payments, seasons, identity, standing, sent, matches] = await Promise.all([
    sql`select question_id, value from answers where member_id = ${me.id}`,
    sql`select kind, amount_kes, status, receipt, created_at, paid_at from payments where member_id = ${me.id}`,
    sql`select starts_at, ends_at, exit_reason, exited_at from seasons where member_id = ${me.id}`,
    sql`select provider, result, checked_at from identity_checks where member_id = ${me.id}`,
    sql`select kind, delta, status, reason, created_at from standing_events where member_id = ${me.id}`,
    sql`select conversation_id, body, created_at from messages where sender_id = ${me.id}`,
    sql`select id, score, why, drop_at, case when member_a = ${me.id} then a_response else b_response end as my_response
        from matches where member_a = ${me.id} or member_b = ${me.id}`,
  ]);
  const { id, phone, firstName, birthDate, gender, seeking, prefAgeMin, prefAgeMax, dealbreakers, profileBio,
    trustedContactName, trustedContactPhone, createdAt } = me;
  const body = {
    exportedAt: new Date().toISOString(),
    profile: { id, phone, firstName, birthDate, gender, seeking, prefAgeMin, prefAgeMax, dealbreakers, profileBio,
      trustedContactName, trustedContactPhone, createdAt },
    answers, payments, seasons, identity, standing, messagesSent: sent, matches,
    note: "Voice intro audio is available at /api/voice/" + id,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="amora-data-${id}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
