import { sql } from "../db";
import { sendSms } from "../integrations/sms";

// Texts each member once when their matches go live.
export async function notifyDrops(): Promise<number> {
  const due = await sql<{ id: string; memberA: string; memberB: string }[]>`
    update matches set notified_at = now() where drop_at <= now() and notified_at is null
    returning id, member_a, member_b`;
  const counts = new Map<string, number>();
  for (const m of due) for (const id of [m.memberA, m.memberB]) counts.set(id, (counts.get(id) ?? 0) + 1);
  if (counts.size === 0) return 0;
  const people = await sql<{ id: string; phone: string; firstName: string }[]>`
    select id, phone, first_name from members where id in ${sql([...counts.keys()])}`;
  for (const p of people) {
    const n = counts.get(p.id)!;
    await sendSms(p.phone, `Hi ${p.firstName}, your ${n === 1 ? "new Amora match is" : `${n} new Amora matches are`} here. Open the app to see why we matched you.`);
  }
  return people.length;
}
