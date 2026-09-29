import { MEMBERSHIP_PRICE_KES, RENEWAL_REMINDER_DAYS } from "../config";
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

// There's no auto-debit, so members get one text a few days before their month ends.
export async function remindRenewals(): Promise<number> {
  const due = await sql<{ phone: string; firstName: string }[]>`
    with s as (
      update seasons set renewal_reminded_at = now()
      where renewal_reminded_at is null and exited_at is null
        and ends_at > now() and ends_at <= now() + make_interval(days => ${RENEWAL_REMINDER_DAYS})
        and not exists (select 1 from seasons later where later.member_id = seasons.member_id
                        and later.exited_at is null and later.starts_at >= seasons.ends_at)
      returning member_id)
    select m.phone, m.first_name from s join members m on m.id = s.member_id where m.account_status = 'active'`;
  for (const m of due) {
    await sendSms(m.phone, `Hi ${m.firstName}, your Amora membership ends in ${RENEWAL_REMINDER_DAYS} days. Renew for KES ${MEMBERSHIP_PRICE_KES.toLocaleString()} in the app to keep your matches coming.`);
  }
  return due.length;
}
