import type { Member } from "./auth";

// Onboarding runs in this order. The fee comes before the ID check so bots
// can't spend the verification budget.
export type Step =
  | "fee"
  | "identity"
  | "questionnaire"
  | "vetting"
  | "voice"
  | "profile"
  | "review"
  | "season"
  | "ready";

export const STEP_LABELS: Record<Exclude<Step, "ready">, string> = {
  fee: "Pay the KES 300 application fee",
  identity: "Verify your identity",
  questionnaire: "Answer the values & intent questions",
  vetting: "Tell us about yourself, in your own words",
  voice: "Record a 30-second voice intro",
  profile: "Approve your profile",
  review: "Matchmaker review",
  season: "Start your membership",
};

export const STEP_PATHS: Record<Exclude<Step, "ready" | "review">, string> = {
  fee: "/app/fee",
  identity: "/app/identity",
  questionnaire: "/app/questionnaire",
  vetting: "/app/vetting",
  voice: "/app/voice",
  profile: "/app/profile",
  season: "/app/season",
};

export function nextStep(m: Pick<Member,
  "feePaidAt" | "idVerifiedAt" | "questionnaireDoneAt" | "vettingDoneAt" | "voiceDoneAt" | "profileApprovedAt" | "reviewStatus">,
  hasActiveSeason: boolean,
): Step {
  if (!m.feePaidAt) return "fee";
  if (!m.idVerifiedAt) return "identity";
  if (!m.questionnaireDoneAt) return "questionnaire";
  // Members approved before vetting existed aren't blocked; they're nudged on their home page.
  if (!m.vettingDoneAt && m.reviewStatus !== "approved") return "vetting";
  if (!m.voiceDoneAt) return "voice";
  if (!m.profileApprovedAt) return "profile";
  if (m.reviewStatus !== "approved") return "review";
  if (!hasActiveSeason) return "season";
  return "ready";
}
