import { CONVERSATION_DAYS, GHOST_QUIET_HOURS } from "../config";
import { sql } from "../db";
import { ghostCandidates } from "../standing";
import { recordStanding } from "./standing";
import { sendSms } from "../integrations/sms";

export interface MatchRow {
  id: string;
  memberA: string;
  memberB: string;
  score: number;
  pillars: Record<string, number>;
  why: string;
  dropAt: Date;
  aResponse: string | null;
  bResponse: string | null;
}

export function otherId(m: Pick<MatchRow, "memberA" | "memberB">, me: string): string {
  return m.memberA === me ? m.memberB : m.memberA;
}

export function myResponse(m: MatchRow, me: string): string | null {
  return m.memberA === me ? m.aResponse : m.bResponse;
}

export function theirResponse(m: MatchRow, me: string): string | null {
  return m.memberA === me ? m.bResponse : m.aResponse;
}

// Records a response. Opens the conversation when both people accept.
export async function respondToMatch(matchId: string, me: string, response: "accept" | "pass" | "save") {
  return sql.begin(async (tx) => {
    const [m] = await tx<MatchRow[]>`
      select * from matches where id = ${matchId} and (member_a = ${me} or member_b = ${me})
        and drop_at <= now() for update`;
    if (!m) return null;
    const current = myResponse(m, me);
    if (current === "accept" || current === "pass") return m; // final answers can't be changed
    if (m.memberA === me) await tx`update matches set a_response = ${response} where id = ${matchId}`;
    else await tx`update matches set b_response = ${response} where id = ${matchId}`;
    if (response === "accept" && theirResponse(m, me) === "accept") {
      await tx`
        insert into conversations (match_id, expires_at)
        values (${matchId}, now() + make_interval(days => ${CONVERSATION_DAYS}))
        on conflict (match_id) do nothing`;
      return { ...m, opened: true };
    }
    return m;
  });
}

export interface ConversationRow {
  id: string;
  matchId: string;
  openedAt: Date;
  expiresAt: Date;
  status: "open" | "date_planned" | "closed" | "expired";
  closedBy: string | null;
  closeKind: string | null;
  closeMessage: string | null;
  memberA: string;
  memberB: string;
}

export async function conversationFor(conversationId: string, me: string): Promise<ConversationRow | null> {
  const [c] = await sql<ConversationRow[]>`
    select c.*, m.member_a, m.member_b from conversations c join matches m on m.id = c.match_id
    where c.id = ${conversationId} and (m.member_a = ${me} or m.member_b = ${me})`;
  return c ?? null;
}

// Stage 1: both listen to each other's voice intro. Stage 2: three guided prompts each. Stage 3: free chat.
export async function conversationStage(c: ConversationRow): Promise<"listen" | "prompts" | "chat"> {
  const [{ listens, prompts }] = await sql<{ listens: number; prompts: number }[]>`
    select (select count(*)::int from conversation_listens where conversation_id = ${c.id}) as listens,
           (select count(*)::int from prompt_answers where conversation_id = ${c.id}) as prompts`;
  if (listens < 2) return "listen";
  if (prompts < 6) return "prompts";
  return "chat";
}

// Runs from the scheduled tick. Expires finished windows and raises ghosting
// proposals for a person to review. Nothing is penalised automatically.
export async function expireConversations(): Promise<number> {
  const due = await sql<ConversationRow[]>`
    select c.*, m.member_a, m.member_b from conversations c join matches m on m.id = c.match_id
    where c.status = 'open' and c.expires_at <= now()`;
  for (const c of due) {
    await sql.begin(async (tx) => {
      const [locked] = await tx`select id from conversations where id = ${c.id} and status = 'open' for update`;
      if (!locked) return;
      await tx`update conversations set status = 'expired', closed_at = now() where id = ${c.id}`;
    });
    const last = await sql<{ senderId: string; at: Date }[]>`
      select sender_id, max(created_at) as at from messages where conversation_id = ${c.id} group by sender_id`;
    const lastSent = new Map<string, Date | null>([[c.memberA, null], [c.memberB, null]]);
    for (const r of last) lastSent.set(r.senderId, r.at);
    for (const who of ghostCandidates([c.memberA, c.memberB], lastSent, c.expiresAt, GHOST_QUIET_HOURS)) {
      await recordStanding(who, "ghosted", "A conversation expired while the other person was waiting on you.", c.id);
    }
  }
  return due.length;
}

// Nudges people whose date is today, and asks them to check in once it has started.
export async function dateReminders(): Promise<number> {
  const due = await sql<{ id: string; startsAt: Date; name: string; area: string; memberA: string; memberB: string }[]>`
    select d.id, d.starts_at, v.name, v.area, m.member_a, m.member_b
    from date_plans d join venues v on v.id = d.venue_id
    join conversations c on c.id = d.conversation_id join matches m on m.id = c.match_id
    where d.confirmed_at is not null and d.reminder_sent_at is null
      and d.starts_at <= now() + interval '3 hours' and d.starts_at > now() - interval '1 hour'`;
  for (const d of due) {
    const people = await sql<{ phone: string; firstName: string }[]>`
      select phone, first_name from members where id in (${d.memberA}, ${d.memberB})`;
    for (const p of people) {
      await sendSms(p.phone, `Hi ${p.firstName}, your Amora date at ${d.name}, ${d.area} is today. After you meet, tap "I'm okay" in the app so we know you're safe.`);
    }
    await sql`update date_plans set reminder_sent_at = now() where id = ${d.id}`;
  }
  return due.length;
}
