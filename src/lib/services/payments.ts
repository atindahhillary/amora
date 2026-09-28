import { APPLICATION_FEE_KES, SEASON_DAYS, SEASON_PRICE_KES } from "../config";
import { sql } from "../db";
import { stkPush } from "../integrations/mpesa";

export type PaymentKind = "application_fee" | "season_pass";

const PRICES: Record<PaymentKind, number> = {
  application_fee: APPLICATION_FEE_KES,
  season_pass: SEASON_PRICE_KES,
};

export async function startPayment(memberId: string, phone: string, kind: PaymentKind): Promise<string> {
  const amount = PRICES[kind];
  const push = await stkPush({
    phone,
    amountKes: amount,
    reference: kind === "application_fee" ? "AMORA-APP" : "AMORA-SEASON",
    description: kind === "application_fee" ? "Application" : "Season pass",
  });
  const [row] = await sql<{ id: string }[]>`
    insert into payments (member_id, kind, amount_kes, phone, provider, checkout_request_id)
    values (${memberId}, ${kind}, ${amount}, ${phone}, ${push.mock ? "mock" : "mpesa"}, ${push.checkoutRequestId})
    returning id`;
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
    } else {
      await tx`
        insert into seasons (member_id, payment_id, starts_at, ends_at)
        values (${p.memberId}, ${p.id}, now(), now() + make_interval(days => ${SEASON_DAYS}))`;
    }
  });
}

export async function activeSeason(memberId: string) {
  const [s] = await sql<{ id: string; startsAt: Date; endsAt: Date }[]>`
    select id, starts_at, ends_at from seasons
    where member_id = ${memberId} and exited_at is null and starts_at <= now() and ends_at > now()
    order by ends_at desc limit 1`;
  return s ?? null;
}

// Redeems a gift season given by a member who left because they met someone.
export async function redeemGift(memberId: string, code: string): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [gift] = await tx<{ id: string; memberId: string }[]>`
      select id, member_id from seasons where gift_code = ${code.trim().toUpperCase()} for update`;
    if (!gift || gift.memberId === memberId) return false;
    await tx`update seasons set gift_code = null where id = ${gift.id}`;
    await tx`
      insert into seasons (member_id, starts_at, ends_at)
      values (${memberId}, now(), now() + make_interval(days => ${SEASON_DAYS}))`;
    return true;
  });
}
