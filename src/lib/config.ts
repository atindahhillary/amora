// Product decisions live here so they are one-line changes, not refactors.

// The concept note says 25+ in Section 3 and 21+ in the wireframe. Season 1 uses 25 to 40.
export const AGE_MIN = 25;
export const AGE_MAX = 40;

export const CITY = "Nairobi";
export const TIMEZONE_OFFSET_HOURS = 3; // Africa/Nairobi, no daylight saving

export const APPLICATION_FEE_KES = 300;
export const SEASON_PRICE_KES = 3000;
export const SEASON_DAYS = 90;
export const MET_SOMEONE_REFUND_KES = 1500;

export const MATCHES_PER_WEEK = 2;
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
