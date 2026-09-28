"use server";

import { requireMember } from "@/lib/auth";
import { mockIntegrations } from "@/lib/config";
import { sql } from "@/lib/db";
import { completePayment, startPayment, type PaymentKind } from "@/lib/services/payments";

export type PayState = { paymentId?: string; error?: string } | undefined;

export async function startPaymentAction(_: PayState, form: FormData): Promise<PayState> {
  const me = await requireMember();
  const kind = form.get("kind") as PaymentKind;
  if (kind !== "application_fee" && kind !== "season_pass") return { error: "Unknown payment" };
  if (kind === "application_fee" && me.feePaidAt) return { error: "Your application fee is already paid." };
  if (kind === "season_pass" && me.reviewStatus !== "approved") return { error: "Your application hasn't been approved yet." };
  try {
    return { paymentId: await startPayment(me.id, me.phone, kind) };
  } catch (err) {
    console.error(err);
    return { error: "M-Pesa didn't accept the request. Check your number and try again." };
  }
}

// Test mode only: stands in for the member entering their M-Pesa PIN.
export async function confirmMockPaymentAction(paymentId: string): Promise<void> {
  if (!mockIntegrations()) throw new Error("Not available");
  const me = await requireMember();
  const [p] = await sql<{ checkoutRequestId: string; amountKes: number }[]>`
    select checkout_request_id, amount_kes from payments where id = ${paymentId} and member_id = ${me.id}`;
  if (!p) return;
  await completePayment({
    checkoutRequestId: p.checkoutRequestId,
    success: true,
    resultDesc: "Mock payment confirmed",
    receipt: `MOCK${Date.now().toString(36).toUpperCase()}`,
    amount: p.amountKes,
  });
}
