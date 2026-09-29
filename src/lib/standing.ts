import { STANDING_ATTENTION_BELOW, STANDING_REVIEW_BELOW, STANDING_START } from "./config";

// Standing is private and explainable: members see every event that moved it.
// Positive events apply immediately. Penalties are 'proposed' until a person reviews them.

export const STANDING_RULES = {
  closed_respectfully: { delta: 2, label: "Closed a conversation respectfully", needsReview: false },
  date_planned: { delta: 3, label: "Planned a date", needsReview: false },
  checked_in: { delta: 1, label: "Checked in after a date", needsReview: false },
  ghosted: { delta: -10, label: "Let a conversation expire without replying or closing", needsReview: true },
  no_show: { delta: -15, label: "Didn't show up to a confirmed date", needsReview: true },
  report_upheld: { delta: -25, label: "A report about you was upheld after review", needsReview: true },
} as const;

export type StandingKind = keyof typeof STANDING_RULES;

export const HELPS = [
  "Replying within the 7-day window",
  "Closing with one tap when it isn't right. Closing never counts against you",
  "Planning dates and checking in afterwards",
];
export const HURTS = [
  "Letting a conversation expire without a reply or a close",
  "Missing a date you confirmed",
  "Behaviour that gets a report upheld",
];

export type StandingTier = "good" | "attention" | "review";

export function standingScore(appliedDeltas: number[]): number {
  const raw = appliedDeltas.reduce((s, d) => s + d, STANDING_START);
  return Math.max(0, Math.min(STANDING_START, raw));
}

export function standingTier(score: number): StandingTier {
  if (score < STANDING_REVIEW_BELOW) return "review";
  if (score < STANDING_ATTENTION_BELOW) return "attention";
  return "good";
}

export const TIER_COPY: Record<StandingTier, { title: string; body: string }> = {
  good: { title: "Good standing", body: "You're matched as normal." },
  attention: {
    title: "Needs attention",
    body: "You're still matched. A few recent conversations ended without a close. Replying or closing respectfully brings this back up.",
  },
  review: {
    title: "Under review",
    body: "A matchmaker will look at your account before your next matches. You'll hear from us, and you can reply to explain.",
  },
};

// Who, if anyone, should get a ghosting proposal when a window expires.
// A member is flagged if they haven't sent anything in the last `quietHours`
// of the window, but only if the other person was still engaging.
export function ghostCandidates(
  participants: [string, string],
  lastSentAt: Map<string, Date | null>,
  expiresAt: Date,
  quietHours: number,
): string[] {
  const cutoff = expiresAt.getTime() - quietHours * 3_600_000;
  const quiet = participants.filter((p) => {
    const t = lastSentAt.get(p);
    return !t || t.getTime() < cutoff;
  });
  // Both went quiet: the conversation faded mutually, nobody is penalised.
  return quiet.length === 1 ? quiet : [];
}
