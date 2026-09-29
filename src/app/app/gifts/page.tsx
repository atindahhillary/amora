import { SubmitButton } from "@/components/SubmitButton";
import { GiftArt } from "@/components/GiftArt";
import { requireMember } from "@/lib/auth";
import { mockIntegrations } from "@/lib/config";
import { sql } from "@/lib/db";
import { giftableConversations, giftCatalog } from "@/lib/services/gifts";
import { formatNairobi } from "@/lib/time";
import { declineGiftAction } from "../gift-actions";
import { AcceptGiftForm, SendGiftForm } from "./forms";

interface GiftRow {
  id: string; status: string; note: string | null; createdAt: Date;
  itemName: string; category: string; priceKes: number; otherName: string;
}

const SENT_STATUS: Record<string, string> = {
  offered: "Waiting for them to accept",
  accepted: "Accepted · being prepared",
  dispatched: "On its way",
  delivered: "Delivered",
  declined: "Not accepted · refunded",
};

export default async function GiftsPage({ searchParams }: { searchParams: Promise<{ to?: string; sent?: string }> }) {
  const me = await requireMember();
  const { to, sent } = await searchParams;
  const [items, recipients] = await Promise.all([giftCatalog(), giftableConversations(me.id)]);
  const received = await sql<GiftRow[]>`
    select g.id, g.status, g.note, g.created_at, i.name as item_name, i.category, g.price_kes, s.first_name as other_name
    from gifts g join gift_items i on i.id = g.item_id join members s on s.id = g.sender_id
    where g.recipient_id = ${me.id} and g.status <> 'awaiting_payment' and g.status <> 'cancelled'
    order by g.created_at desc`;
  const sentGifts = await sql<GiftRow[]>`
    select g.id, g.status, g.note, g.created_at, i.name as item_name, i.category, g.price_kes, r.first_name as other_name
    from gifts g join gift_items i on i.id = g.item_id join members r on r.id = g.recipient_id
    where g.sender_id = ${me.id} and g.status <> 'awaiting_payment' and g.status <> 'cancelled'
    order by g.created_at desc`;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Gifts</p>
        <h1 className="mt-1 text-4xl">Say it with <em>flowers</em></h1>
        <p className="mt-2 text-muted">
          Send flowers, chocolates or a handwritten card to someone you&apos;re talking to. They choose whether to accept
          it and where it goes, so their address always stays private.
        </p>
      </div>

      {sent && <p className="notice">Paid. We&apos;ve let them know a gift is waiting.</p>}

      {received.filter((g) => g.status === "offered").map((g) => (
        <div key={g.id} className="kanga">
          <div className="kanga-field space-y-4">
            <div className="flex items-center gap-4">
              <GiftArt category={g.category} />
              <div>
                <p className="eyebrow">A gift for you</p>
                <p className="font-serif text-2xl text-wine-dark">{g.otherName} sent you {g.itemName.toLowerCase()}</p>
                {g.note && <p className="mt-1 font-serif text-lg text-wine italic">&ldquo;{g.note}&rdquo;</p>}
              </div>
            </div>
            <AcceptGiftForm giftId={g.id} />
            <form action={declineGiftAction}>
              <input type="hidden" name="giftId" value={g.id} />
              <SubmitButton className="btn-quiet px-0">Decline politely</SubmitButton>
            </form>
            <p className="hint">If you decline, {g.otherName} is refunded and told only that it wasn&apos;t accepted.</p>
          </div>
        </div>
      ))}

      <section className="card space-y-4">
        <h2 className="text-2xl">Send a gift</h2>
        {recipients.length === 0 ? (
          <p className="notice">You can send gifts once you and a match have both accepted and started talking.</p>
        ) : (
          <SendGiftForm items={items} recipients={recipients.map((r) => ({ id: r.id, firstName: r.firstName }))} defaultTo={to} mock={mockIntegrations()} />
        )}
      </section>

      {(sentGifts.length > 0 || received.some((g) => g.status !== "offered")) && (
        <section className="card space-y-3">
          <h2 className="text-2xl">Your gifts</h2>
          <ul className="divide-y divide-line">
            {sentGifts.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-3 text-sm">
                <GiftArt category={g.category} className="h-10 w-10 shrink-0" />
                <div className="flex-1">
                  <p>You sent {g.otherName} {g.itemName.toLowerCase()}</p>
                  <p className="text-muted">{formatNairobi(g.createdAt)}</p>
                </div>
                <span className="pill">{SENT_STATUS[g.status] ?? g.status}</span>
              </li>
            ))}
            {received.filter((g) => g.status !== "offered").map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-3 text-sm">
                <GiftArt category={g.category} className="h-10 w-10 shrink-0" />
                <div className="flex-1">
                  <p>{g.otherName} sent you {g.itemName.toLowerCase()}</p>
                  <p className="text-muted">{formatNairobi(g.createdAt)}</p>
                </div>
                <span className="pill">{g.status === "declined" ? "You declined" : SENT_STATUS[g.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
