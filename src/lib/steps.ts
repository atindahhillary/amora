import type { Member } from "./auth";

// Onboarding runs in this order. The fee comes before the ID check so bots
// can't spend the verification budget.
export type Step =
  | "fee"
  | "identity"
  | "questionnaire"
  | "voice"
  | "profile"
  | "review"
  | "season"
  | "ready";

export const STEP_LABELS: Record<Exclude<Step, "ready">, string> = {
  fee: "Pay the KES 300 application fee",
  identity: "Verify your identity",
  questionnaire: "Answer the values & intent questions",
  voice: "Record a 30-second voice intro",
  profile: "Approve your profile",
  review: "Matchmaker review",
  season: "Start your season",
};

export const STEP_PATHS: Record<Exclude<Step, "ready" | "review">, string> = {
  fee: "/app/fee",
  identity: "/app/identity",
  questionnaire: "/app/questionnaire",
  voice: "/app/voice",
  profile: "/app/profile",
  season: "/app/season",
};

export function nextStep(m: Pick<Member,
  "feePaidAt" | "idVerifiedAt" | "questionnaireDoneAt" | "voiceDoneAt" | "profileApprovedAt" | "reviewStatus">,
  hasActiveSeason: boolean,
): Step {
  if (!m.feePaidAt) return "fee";
  if (!m.idVerifiedAt) return "identity";
  if (!m.questionnaireDoneAt) return "questionnaire";
  if (!m.voiceDoneAt) return "voice";
  if (!m.profileApprovedAt) return "profile";
  if (m.reviewStatus !== "approved") return "review";
  if (!hasActiveSeason) return "season";
  return "ready";
}
