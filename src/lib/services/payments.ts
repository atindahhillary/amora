import { APPLICATION_FEE_KES, MEMBERSHIP_DAYS, MEMBERSHIP_PRICE_KES } from "../config";
import { sql } from "../db";
import { stkPush } from "../integrations/mpesa";
import { sendSms } from "../integrations/sms";

// "season_pass" is the monthly membership; the name is kept for existing records.
export type PaymentKind = "application_fee" | "season_pass" | "gift";

const FIXED_PRICES: Record<Exclude<PaymentKind, "gift">, number> = {
  application_fee: APPLICATION_FEE_KES,
  season_pass: MEMBERSHIP_PRICE_KES,
};

const LABELS: Record<PaymentKind, { reference: string; description: string }> = {
  application_fee: { reference: "AMORA-APP", description: "Application" },
  season_pass: { reference: "AMORA-MONTH", description: "Membership" },
  gift: { reference: "AMORA-GIFT", description: "Gift" },
};

export async function startPayment(
  memberId: string,
  phone: string,
  kind: PaymentKind,
  gift?: { id: string; priceKes: number },
): Promise<string> {
  const amount = kind === "gift" ? gift!.priceKes : FIXED_PRICES[kind];
  const push = await stkPush({ phone, amountKes: amount, ...LABELS[kind] });
  const [row] = await sql<{ id: string }[]>`
    insert into payments (member_id, kind, amount_kes, phone, provider, checkout_request_id)
    values (${memberId}, ${kind}, ${amount}, ${phone}, ${push.mock ? "mock" : "mpesa"}, ${push.checkoutRequestId})
    returning id`;
  if (gift) await sql`update gifts set payment_id = ${row.id} where id = ${gift.id} and sender_id = ${memberId}`;
  return row.id;
}

// Applies a confirmed payment exactly once. Safe to call again for the same payment.
export async function completePayment(opts: {
  checkoutRequestId: string;
  success: boolean;
  resultDesc: string;
  receipt: string | null;
  amount: number | null;
}): Promise<void> {
  let notify: { phone: string; firstName: string; sender: string }[] = [];
  await sql.begin(async (tx) => {
    const [p] = await tx<{ id: string; memberId: string; kind: PaymentKind; amountKes: number; status: string }[]>`
      select id, member_id, kind, amount_kes, status from payments
      where checkout_request_id = ${opts.checkoutRequestId} for update`;
    if (!p || p.status !== "pending") return;
    if (!opts.success || (opts.amount !== null && opts.amount < p.amountKes)) {
      await tx`update payments set status = 'failed', result_desc = ${opts.resultDesc} where id = ${p.id}`;
      return;
    }
    await tx`
      update payments set status = 'paid', receipt = ${opts.receipt}, result_desc = ${opts.resultDesc}, paid_at = now()
      where id = ${p.id}`;
    if (p.kind === "application_fee") {
      await tx`update members set fee_paid_at = coalesce(fee_paid_at, now()) where id = ${p.memberId}`;
    } else if (p.kind === "season_pass") {
      // A renewal paid before the current month ends starts when that month ends.
      await tx`
        insert into seasons (member_id, payment_id, starts_at, ends_at)
        select ${p.memberId}, ${p.id}, s.start, s.start + make_interval(days => ${MEMBERSHIP_DAYS})
        from (select greatest(now(), coalesce((select max(ends_at) from seasons
              where member_id = ${p.memberId} and exited_at is null), now())) as start) s`;
    } else {
      notify = await tx<{ phone: string; firstName: string; sender: string }[]>`
        with g as (
          update gifts set status = 'offered' where payment_id = ${p.id} and status = 'awaiting_payment'
          returning recipient_id, sender_id)
        select r.phone, r.first_name, s.first_name as sender
        from g join members r on r.id = g.recipient_id join members s on s.id = g.sender_id`;
    }
  });
  for (const n of notify) {
    await sendSms(n.phone, `Hi ${n.firstName}, ${n.sender} sent you a gift on Amora. Open the app to accept it or decline politely.`);
  }
}

export async function activeSeason(memberId: string) {
  const [s] = await sql<{ id: string; startsAt: Date; endsAt: Date }[]>`
    select id, starts_at, ends_at from seasons
    where member_id = ${memberId} and exited_at is null and starts_at <= now() and ends_at > now()
    order by ends_at desc limit 1`;
  return s ?? null;
}

// Redeems a free month given by a member who left because they met someone.
export async function redeemGift(memberId: string, code: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [gift] = await tx<{ id: string; memberId: string }[]>`
      select id, member_id from seasons where gift_code = ${code.trim().toUpperCase()} for update`;
    if (!gift || gift.memberId === memberId) return false;
    await tx`update seasons set gift_code = null where id = ${gift.id}`;
    await tx`
      insert into seasons (member_id, starts_at, ends_at)
      values (${memberId}, now(), now() + make_interval(days => ${MEMBERSHIP_DAYS}))`;
    return true;
  });
}
