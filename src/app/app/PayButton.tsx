"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmMockPaymentAction, startPaymentAction } from "./payment-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function PayButton({ kind, label, mock, doneHref, giftId }: { kind: string; label: string; mock: boolean; doneHref: string; giftId?: string }) {
  const [state, action] = useActionState(startPaymentAction, undefined);
  const [status, setStatus] = useState<string>("idle");
  const [confirming, startConfirm] = useTransition();
  const router = useRouter();
  const paymentId = state?.paymentId;

  useEffect(() => {
    if (!paymentId) return;
    setStatus("pending");
    let stop = false;
    const tick = async () => {
      const res = await fetch(`/api/payments/${paymentId}`, { cache: "no-store" });
      const json = (await res.json()) as { status: string };
      if (stop) return;
      setStatus(json.status);
      if (json.status === "paid") router.push(doneHref);
      else if (json.status === "pending") setTimeout(tick, 2500);
    };
    tick();
    return () => { stop = true; };
  }, [paymentId, doneHref, router]);

  if (paymentId && status !== "failed") {
    return (
      <div className="space-y-3">
        <p className="notice">
          {status === "paid" ? "Payment received. Taking you to the next step…" : "Check your phone and enter your M-Pesa PIN to approve the payment."}
        </p>
        {mock && status === "pending" && (
          <button className="btn-ghost" disabled={confirming}
            onClick={() => startConfirm(async () => { await confirmMockPaymentAction(paymentId); })}>
            Test mode: approve payment
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      {status === "failed" && <p className="error" role="alert">The payment didn&apos;t go through. You can try again.</p>}
      <input type="hidden" name="kind" value={kind} />
      {giftId && <input type="hidden" name="giftId" value={giftId} />}
      <SubmitButton pendingText="Sending request to your phone…">{label}</SubmitButton>
    </form>
  );
}
