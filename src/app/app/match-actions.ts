"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { CLOSE_TEMPLATES, GUIDED_PROMPTS } from "@/lib/config";
import { sql } from "@/lib/db";
import { sendSms } from "@/lib/integrations/sms";
import { conversationFor, conversationStage, otherId, respondToMatch } from "@/lib/services/conversations";
import { recordStanding } from "@/lib/services/standing";
import { formatNairobi } from "@/lib/time";

export type FormState = { error?: string; ok?: string } | undefined;

export async function respondAction(form: FormData): Promise<void> {
  const me = await requireMember();
  const matchId = String(form.get("matchId"));
  const response = String(form.get("response"));
  if (!["accept", "pass", "save"].includes(response)) return;
  const result = await respondToMatch(matchId, me.id, response as "accept" | "pass" | "save");
  if (result && "opened" in result) {
    const [c] = await sql<{ id: string }[]>`select id from conversations where match_id = ${matchId}`;
    const [other] = await sql<{ phone: string; firstName: string }[]>`select phone, first_name from members where id = ${otherId(result, me.id)}`;
    await sendSms(other.phone, `Hi ${other.firstName}, ${me.firstName} accepted your match on Amora. Your conversation is open for 7 days.`);
    redirect(`/app/conversations/${c.id}`);
  }
  revalidatePath(`/app/matches/${matchId}`);
  revalidatePath("/app/matches");
}

async function openConversation(id: string) {
  const me = await requireMember();
  const c = await conversationFor(id, me.id);
  if (!c) throw new Error("Conversation not found");
  return { me, c };
}

export async function markListenedAction(form: FormData): Promise<void> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  await sql`insert into conversation_listens (conversation_id, member_id) values (${c.id}, ${me.id}) on conflict do nothing`;
  revalidatePath(`/app/conversations/${c.id}`);
}

export async function answerPromptAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  if (c.status !== "open" && c.status !== "date_planned") return { error: "This conversation has ended." };
  const idx = Number(form.get("promptIndex"));
  const body = String(form.get("body") ?? "").trim();
  if (!(idx >= 0 && idx < GUIDED_PROMPTS.length)) return { error: "Unknown prompt" };
  if (body.length < 2 || body.length > 600) return { error: "Answers should be between a few words and 600 characters." };
  await sql`
    insert into prompt_answers (conversation_id, member_id, prompt_index, body) values (${c.id}, ${me.id}, ${idx}, ${body})
    on conflict do nothing`;
  revalidatePath(`/app/conversations/${c.id}`);
  return undefined;
}

export async function sendMessageAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  if (c.status !== "open" && c.status !== "date_planned") return { error: "This conversation has ended." };
  if ((await conversationStage(c)) !== "chat") return { error: "Finish the voice intros and prompts first." };
  const body = String(form.get("body") ?? "").trim();
  if (!body) return undefined;
  if (body.length > 2000) return { error: "Messages can be up to 2,000 characters." };
  await sql`insert into messages (conversation_id, sender_id, body) values (${c.id}, ${me.id}, ${body})`;
  revalidatePath(`/app/conversations/${c.id}`);
  return undefined;
}

export async function closeAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  if (c.status !== "open" && c.status !== "date_planned") return { error: "This conversation has already ended." };
  const kind = String(form.get("kind"));
  const other = otherId(c, me.id);

  if (kind === "respectful") {
    const t = Number(form.get("template"));
    const message = CLOSE_TEMPLATES[t];
    if (!message) return { error: "Choose a message" };
    await sql`
      update conversations set status = 'closed', closed_by = ${me.id}, close_kind = 'respectful',
        close_message = ${message}, closed_at = now() where id = ${c.id}`;
    await recordStanding(me.id, "closed_respectfully", "You closed a conversation with a respectful message.", c.id);
  } else if (kind === "safety") {
    const reason = String(form.get("reason") ?? "");
    if (!reason) return { error: "Tell us what happened so we can help" };
    await sql.begin(async (tx) => {
      await tx`
        update conversations set status = 'closed', closed_by = ${me.id}, close_kind = 'safety', closed_at = now()
        where id = ${c.id}`;
      await tx`insert into blocks (blocker_id, blocked_id) values (${me.id}, ${other}) on conflict do nothing`;
      await tx`
        insert into reports (reporter_id, reported_id, conversation_id, reason, details)
        values (${me.id}, ${other}, ${c.id}, ${reason}, ${String(form.get("details") ?? "").slice(0, 2000)})`;
    });
  } else {
    return { error: "Unknown action" };
  }
  redirect(`/app/conversations/${c.id}`);
}

export async function planDateAction(_: FormState, form: FormData): Promise<FormState> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  if (c.status !== "open") return { error: "You can only plan a date in an open conversation." };
  const venueId = Number(form.get("venueId"));
  const local = String(form.get("startsAt") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return { error: "Choose a date and time" };
  const startsAt = new Date(`${local}:00+03:00`);
  const hoursAway = (startsAt.getTime() - Date.now()) / 3_600_000;
  if (hoursAway < 2 || hoursAway > 24 * 21) return { error: "Pick a time between 2 hours and 3 weeks from now." };
  const [venue] = await sql`select id from venues where id = ${venueId} and active`;
  if (!venue) return { error: "Choose one of our partner venues" };
  await sql`
    insert into date_plans (conversation_id, venue_id, starts_at, proposed_by) values (${c.id}, ${venueId}, ${startsAt}, ${me.id})
    on conflict (conversation_id) do update set venue_id = excluded.venue_id, starts_at = excluded.starts_at,
      proposed_by = excluded.proposed_by, confirmed_at = null, reminder_sent_at = null
    where date_plans.confirmed_at is null`;
  revalidatePath(`/app/conversations/${c.id}`);
  return { ok: "Date suggested. They'll confirm or suggest another time." };
}

export async function confirmDateAction(form: FormData): Promise<void> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  const [d] = await sql<{ id: string; startsAt: Date; name: string; area: string }[]>`
    update date_plans d set confirmed_at = now() from venues v
    where d.conversation_id = ${c.id} and d.proposed_by <> ${me.id} and d.confirmed_at is null and v.id = d.venue_id
    returning d.id, d.starts_at, v.name, v.area`;
  if (!d) return;
  await sql`update conversations set status = 'date_planned' where id = ${c.id} and status = 'open'`;
  const people = await sql<{ id: string; firstName: string; trustedContactName: string | null; trustedContactPhone: string | null }[]>`
    select id, first_name, trusted_contact_name, trusted_contact_phone from members where id in (${c.memberA}, ${c.memberB})`;
  for (const p of people) {
    await recordStanding(p.id, "date_planned", "You planned a date.", c.id);
    // Share the plan with the member's trusted contact. The match's name is never shared.
    if (p.trustedContactPhone) {
      await sendSms(p.trustedContactPhone,
        `Hi ${p.trustedContactName ?? ""}, ${p.firstName} asked Amora to let you know: they're meeting an ID-verified match at ${d.name}, ${d.area} on ${formatNairobi(d.startsAt)}. We'll check in with them on the night.`.replace("Hi ,", "Hi,"));
    }
  }
  revalidatePath(`/app/conversations/${c.id}`);
}

export async function checkInAction(form: FormData): Promise<void> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  const status = String(form.get("status"));
  if (status !== "ok" && status !== "need_help") return;
  const [d] = await sql<{ id: string }[]>`
    select id from date_plans where conversation_id = ${c.id} and confirmed_at is not null and starts_at <= now() + interval '1 hour'`;
  if (!d) return;
  const [row] = await sql`
    insert into date_checkins (date_plan_id, member_id, status) values (${d.id}, ${me.id}, ${status})
    on conflict do nothing returning 1`;
  if (!row) return;
  if (status === "ok") {
    await recordStanding(me.id, "checked_in", "You checked in after your date.", c.id);
  } else {
    if (me.trustedContactPhone) {
      await sendSms(me.trustedContactPhone, `${me.firstName} tapped "I need help" on their Amora date. Please call them now. If you can't reach them, call 999 or 112.`);
    }
    await sql`
      insert into reports (reporter_id, reported_id, conversation_id, reason, details)
      values (${me.id}, ${otherId(c, me.id)}, ${c.id}, 'date_help', 'Member tapped "I need help" during a date check-in.')`;
  }
  revalidatePath(`/app/conversations/${c.id}`);
}

export async function reportNoShowAction(form: FormData): Promise<void> {
  const { me, c } = await openConversation(String(form.get("conversationId")));
  const [d] = await sql`
    select 1 from date_plans where conversation_id = ${c.id} and confirmed_at is not null and starts_at < now()`;
  if (!d) return;
  const other = otherId(c, me.id);
  const [existing] = await sql`
    select 1 from standing_events where member_id = ${other} and conversation_id = ${c.id} and kind = 'no_show'`;
  if (!existing) {
    await recordStanding(other, "no_show", "Your match reported that you didn't come to a confirmed date.", c.id);
  }
  revalidatePath(`/app/conversations/${c.id}`);
}
