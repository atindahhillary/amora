import { SubmitButton } from "@/components/SubmitButton";
import { sql } from "@/lib/db";
import { markRefundedAction } from "../actions";

export default async function RefundsPage() {
  const rows = await sql<{ id: string; kind: string; amountKes: number; phone: string; receipt: string | null; firstName: string | null }[]>`
    select p.id, p.kind, p.amount_kes, p.phone, p.receipt, m.first_name
    from payments p left join members m on m.id = p.member_id where p.status = 'refund_requested' order by p.created_at`;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl">Refunds</h1>
        <p className="mt-1 text-muted">
          Send these from the M-Pesa business portal (automatic B2C refunds come later), then mark them done.
          Refunds are always the full amount: application fees for people we couldn&apos;t accept, and gifts the recipient declined.
        </p>
      </div>
      {rows.length === 0 && <p className="notice">Nothing to refund.</p>}
      {rows.map((p) => (
        <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3 text-sm">
          <p>
            <strong>{p.firstName ?? "Deleted member"}</strong> · {p.kind.replace("_", " ")} · refund KES{" "}
            {p.amountKes.toLocaleString()} to +{p.phone} · receipt {p.receipt ?? "–"}
          </p>
          <form action={markRefundedAction}>
            <input type="hidden" name="paymentId" value={p.id} />
            <SubmitButton className="btn-ghost">Mark refunded</SubmitButton>
          </form>
        </div>
      ))}
    </div>
  );
}
