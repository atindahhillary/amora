import { sql } from "../db";
import { STANDING_RULES, standingScore, standingTier, type StandingKind } from "../standing";

export async function recordStanding(
  memberId: string,
  kind: StandingKind,
  reason: string,
  conversationId: string | null = null,
  // Set when a person already reviewed the case, so the penalty applies directly.
  reviewedBy: string | null = null,
): Promise<void> {
  const rule = STANDING_RULES[kind];
  const status = rule.needsReview && !reviewedBy ? "proposed" : "applied";
  await sql`
    insert into standing_events (member_id, kind, delta, status, reason, conversation_id, reviewed_by, reviewed_at)
    values (${memberId}, ${kind}, ${rule.delta}, ${status}, ${reason}, ${conversationId},
      ${reviewedBy}, ${reviewedBy ? sql`now()` : null})`;
}

export async function standingFor(memberId: string) {
  const events = await sql<{
    id: number; kind: StandingKind; delta: number; status: string; reason: string; createdAt: Date;
  }[]>`
    select id, kind, delta, status, reason, created_at from standing_events
    where member_id = ${memberId} and status <> 'dismissed' order by created_at desc`;
  const score = standingScore(events.filter((e) => e.status === "applied").map((e) => e.delta));
  return { score, tier: standingTier(score), events };
}
