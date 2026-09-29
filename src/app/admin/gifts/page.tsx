import { SubmitButton } from "@/components/SubmitButton";
import { sql } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { formatNairobi } from "@/lib/time";
import { advanceGiftAction } from "../actions";

interface Row {
  id: string; status: string; itemName: string; priceKes: number; note: string | null;
  sender: string; recipient: string; recipientPhone: string; deliveryArea: string | null; deliveryDetails: string | null;
  respondedAt: Date | null;
}

// Fulfilment queue for the partner florist. Delivery details are only ever shown here.
export default async function GiftQueuePage() {
  const rows = await sql<Row[]>`
    select g.id, g.status, i.name as item_name, g.price_kes, g.note, s.first_name as sender, r.first_name as recipient,
      r.phone as recipient_phone, g.delivery_area, g.delivery_details, g.responded_at
    from gifts g join gift_items i on i.id = g.item_id join members s on s.id = g.sender_id join members r on r.id = g.recipient_id
    where g.status in ('accepted', 'dispatched') order by g.responded_at`;
  const [{ offered, delivered }] = await sql<{ offered: number; delivered: number }[]>`
    select count(*) filter (where status = 'offered')::int as offered,
           count(*) filter (where status = 'delivered' and delivered_at > now() - interval '30 days')::int as delivered
    from gifts`;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl">Gifts to deliver</h1>
        <p className="mt-1 text-muted">
          {offered} waiting for the recipient to accept · {delivered} delivered in the last 30 days. Delivery details are
          deleted automatically when you mark a gift delivered.
        </p>
      </div>
      {rows.length === 0 && <p className="notice">Nothing to deliver right now.</p>}
      {rows.map((g) => (
        <div key={g.id} className="card space-y-2 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-xl text-wine-dark">{g.itemName} · KES {g.priceKes.toLocaleString()}</p>
            <span className="pill">{g.status === "accepted" ? "To prepare" : "Out for delivery"}</span>
          </div>
          <p>From {g.sender} to <strong>{g.recipient}</strong> ({maskPhone(g.recipientPhone)}) · accepted {g.respondedAt ? formatNairobi(g.respondedAt) : ""}</p>
          <p><span className="text-muted">Deliver to:</span> {g.deliveryArea}. {g.deliveryDetails}</p>
          {g.note && <p><span className="text-muted">Card:</span> &ldquo;{g.note}&rdquo;</p>}
          <form action={advanceGiftAction}>
            <input type="hidden" name="giftId" value={g.id} />
            <SubmitButton name="to" value={g.status === "accepted" ? "dispatched" : "delivered"} className="btn-ghost">
              {g.status === "accepted" ? "Mark as dispatched" : "Mark as delivered"}
            </SubmitButton>
          </form>
        </div>
      ))}
    </div>
  );
}
