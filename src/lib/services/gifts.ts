import { sql } from "../db";
import { sendSms } from "../integrations/sms";

export interface GiftItem {
  id: number;
  name: string;
  description: string;
  category: "flowers" | "chocolates" | "together" | "card";
  priceKes: number;
}

export async function giftCatalog(): Promise<GiftItem[]> {
  return sql<GiftItem[]>`
    select id, name, description, category, price_kes from gift_items where active order by price_kes`;
}

// Conversations the member can send a gift into: both accepted and still talking.
export async function giftableConversations(memberId: string) {
  return sql<{ id: string; otherId: string; firstName: string }[]>`
    select c.id, o.id as other_id, o.first_name
    from conversations c join matches m on m.id = c.match_id
    join members o on o.id = case when m.member_a = ${memberId} then m.member_b else m.member_a end
    where c.status in ('open', 'date_planned') and (m.member_a = ${memberId} or m.member_b = ${memberId})
      and not exists (select 1 from blocks b where (b.blocker_id = ${memberId} and b.blocked_id = o.id)
                                            or (b.blocker_id = o.id and b.blocked_id = ${memberId}))
    order by c.opened_at desc`;
}

export type CreateGiftResult = { giftId: string; priceKes: number } | { error: string };

export async function createGift(
  senderId: string,
  conversationId: string,
  itemId: number,
  note: string,
): Promise<CreateGiftResult> {
  const convo = (await giftableConversations(senderId)).find((c) => c.id === conversationId);
  if (!convo) return { error: "You can only send gifts to someone you're talking to." };
  const [item] = await sql<{ id: number; priceKes: number }[]>`
    select id, price_kes from gift_items where id = ${itemId} and active`;
  if (!item) return { error: "Choose a gift" };
  if (note.length > 200) return { error: "Keep your note under 200 characters" };
  const [pending] = await sql`
    select 1 from gifts where conversation_id = ${conversationId} and sender_id = ${senderId}
      and status in ('offered', 'accepted', 'dispatched')`;
  if (pending) return { error: `Your last gift to ${convo.firstName} hasn't been delivered yet.` };
  // Abandoned checkouts are replaced rather than piling up.
  await sql`delete from gifts where sender_id = ${senderId} and conversation_id = ${conversationId} and status = 'awaiting_payment'`;
  const [g] = await sql<{ id: string }[]>`
    insert into gifts (conversation_id, sender_id, recipient_id, item_id, price_kes, note)
    values (${conversationId}, ${senderId}, ${convo.otherId}, ${item.id}, ${item.priceKes}, ${note || null})
    returning id`;
  return { giftId: g.id, priceKes: item.priceKes };
}

export async function acceptGift(recipientId: string, giftId: string, area: string, details: string) {
  const [g] = await sql<{ senderId: string }[]>`
    update gifts set status = 'accepted', delivery_area = ${area}, delivery_details = ${details}, responded_at = now()
    where id = ${giftId} and recipient_id = ${recipientId} and status = 'offered' returning sender_id`;
  if (!g) return false;
  const [s] = await sql<{ phone: string; firstName: string }[]>`select phone, first_name from members where id = ${g.senderId}`;
  await sendSms(s.phone, `Hi ${s.firstName}, your Amora gift was accepted. We'll let you know when it's delivered.`);
  return true;
}

// Declining is private: the sender is refunded and told only that it wasn't accepted.
export async function declineGift(recipientId: string, giftId: string) {
  return sql.begin(async (tx) => {
    const [g] = await tx<{ paymentId: string | null }[]>`
      update gifts set status = 'declined', responded_at = now()
      where id = ${giftId} and recipient_id = ${recipientId} and status = 'offered' returning payment_id`;
    if (!g) return false;
    if (g.paymentId) await tx`update payments set status = 'refund_requested' where id = ${g.paymentId} and status = 'paid'`;
    return true;
  });
}

// Fulfilment by the matchmaker team. Delivery details are wiped once delivered.
export async function advanceGift(giftId: string, to: "dispatched" | "delivered") {
  const from = to === "dispatched" ? "accepted" : "dispatched";
  const [g] = await sql<{ senderId: string; recipientId: string }[]>`
    update gifts set status = ${to},
      delivered_at = case when ${to} = 'delivered' then now() else delivered_at end,
      delivery_details = case when ${to} = 'delivered' then null else delivery_details end
    where id = ${giftId} and status = ${from} returning sender_id, recipient_id`;
  if (!g || to !== "delivered") return;
  const [s] = await sql<{ phone: string; firstName: string }[]>`select phone, first_name from members where id = ${g.senderId}`;
  await sendSms(s.phone, `Hi ${s.firstName}, your Amora gift has been delivered.`);
}
