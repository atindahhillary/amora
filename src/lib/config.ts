// Product decisions live here so they are one-line changes, not refactors.

// Season 1 is open to ages 25 to 55.
export const AGE_MIN = 25;
export const AGE_MAX = 55;
// When an applicant leaves their preferred age range blank, suggest this many years either side of their own age.
export const DEFAULT_AGE_SPREAD = 8;

export const CITY = "Nairobi";
export const TIMEZONE_OFFSET_HOURS = 3; // Africa/Nairobi, no daylight saving

export const APPLICATION_FEE_KES = 300;
// Monthly membership. Paid by M-Pesa each month; there is no auto-debit.
export const MEMBERSHIP_PRICE_KES = 2500;
export const MEMBERSHIP_DAYS = 30;
export const RENEWAL_REMINDER_DAYS = 3;

// Up to 3 matches per calendar month (Nairobi time), released on Thursdays.
export const MATCHES_PER_MONTH = 3;
// A match the other person passed on doesn't use up one of your 3, so a month
// is never spent on people who said no. Set to false for a hard cap of 3.
export const REPLACE_PASSED_MATCHES = true;
export const DROP_WEEKDAY = 4; // Thursday
export const DROP_HOUR_LOCAL = 18;

export const CONVERSATION_DAYS = 7;
// A ghosting proposal is raised for anyone who went quiet this long before the window closed.
export const GHOST_QUIET_HOURS = 72;
export const VOICE_MAX_SECONDS = 30;
export const VOICE_MAX_BYTES = 1_500_000;

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_PER_HOUR = 5;
export const SESSION_DAYS = 30;

export const STANDING_START = 100;
export const STANDING_ATTENTION_BELOW = 85;
export const STANDING_REVIEW_BELOW = 70;

export const GUIDED_PROMPTS = [
  "What made you say yes to this match?",
  "What does a good Sunday look like for you?",
  "What's one thing you're hoping to build in the next few years?",
] as const;

export const CLOSE_TEMPLATES = [
  "Thank you for the conversation. I don't feel the connection I'm looking for, and I wish you the best this season.",
  "I've enjoyed getting to know you, but I don't think we're the right match. Take care.",
  "I'm going to step back. You've been lovely to talk to, and I hope you find what you're looking for.",
] as const;

export function mockIntegrations(): boolean {
  return process.env.AMORA_MOCK_INTEGRATIONS === "1";
}
