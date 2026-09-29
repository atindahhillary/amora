// The values & intent questionnaire. Every answer is self-declared.
// Nothing here asks about, or lets the algorithm infer, ethnicity or tribe.

export type Pillar = "intent" | "values" | "lifestyle";

export interface Question {
  id: string;
  pillar: Pillar;
  prompt: string;
  options: string[];
  // ordinal: options are a scale, so near answers score partly.
  // category: only identical answers score fully.
  // none: used for dealbreaker rules only, never scored.
  scoring: "ordinal" | "category" | "none";
  // Members may mark these as dealbreakers. Options listed in `flexible`
  // are compatible with any answer when the other person made it a dealbreaker.
  dealbreakerable?: boolean;
  flexible?: number[];
}

export const QUESTIONS: Question[] = [
  // Intent & timeline
  { id: "intent", pillar: "intent", prompt: "What are you looking for this season?", scoring: "ordinal",
    options: ["A relationship that leads to marriage", "A long-term relationship, open to marriage", "A long-term relationship, not sure about marriage"] },
  { id: "timeline", pillar: "intent", prompt: "If it goes well, when would you like to be settled?", scoring: "ordinal",
    options: ["Within 1 to 2 years", "In 2 to 4 years", "No fixed timeline"] },
  { id: "children_want", pillar: "intent", prompt: "Do you want children?", scoring: "ordinal", dealbreakerable: true, flexible: [1],
    options: ["Yes", "Open to it", "No"] },
  { id: "children_have", pillar: "intent", prompt: "Do you have children?", scoring: "none",
    options: ["No", "Yes"] },
  { id: "partner_children", pillar: "intent", prompt: "Are you open to a partner who already has children?", scoring: "none",
    options: ["Yes", "Maybe", "No"] },
  { id: "relocation", pillar: "intent", prompt: "Would you relocate for the right person?", scoring: "ordinal", dealbreakerable: true, flexible: [0],
    options: ["Yes, anywhere", "Yes, within Kenya", "No, I'm staying in Nairobi"] },
  { id: "readiness", pillar: "intent", prompt: "How ready are you for a committed relationship right now?", scoring: "ordinal",
    options: ["Fully ready", "Mostly ready", "Still working some things out"] },
  { id: "meet_pace", pillar: "intent", prompt: "How soon do you like to meet in person?", scoring: "ordinal",
    options: ["Within a week", "Within 2 to 3 weeks", "When it feels right"] },

  // Values, faith & family
  { id: "faith", pillar: "values", prompt: "What is your faith?", scoring: "category",
    options: ["Christian", "Muslim", "Hindu", "Another faith", "Spiritual, not religious", "Not religious"] },
  { id: "faith_importance", pillar: "values", prompt: "How important is faith in your daily life?", scoring: "ordinal",
    options: ["Central", "Important", "Somewhat", "Not important"] },
  { id: "partner_faith", pillar: "values", prompt: "Your partner's faith should be:", scoring: "none",
    options: ["The same as mine", "Respectful of mine", "It doesn't matter"] },
  { id: "family_role", pillar: "values", prompt: "How involved should family be in your relationship decisions?", scoring: "ordinal",
    options: ["Very involved", "Consulted on big decisions", "Mostly our decision"] },
  { id: "ceremonies", pillar: "values", prompt: "Traditional ceremonies (introductions, dowry):", scoring: "ordinal",
    options: ["Very important to me", "Nice to have", "Not important"] },
  { id: "roles", pillar: "values", prompt: "Roles in a marriage should be:", scoring: "ordinal",
    options: ["Shared equally", "Shared, with some traditional roles", "Mostly traditional"] },
  { id: "money_style", pillar: "values", prompt: "With money, you are:", scoring: "ordinal",
    options: ["A saver first", "Balanced", "Enjoy it now"] },
  { id: "money_sharing", pillar: "values", prompt: "In a marriage, money should be:", scoring: "ordinal",
    options: ["Fully pooled", "Partly pooled", "Kept separate"] },
  { id: "extended_family", pillar: "values", prompt: "Supporting extended family financially is:", scoring: "ordinal",
    options: ["Expected", "Case by case", "Not expected"] },
  { id: "conflict", pillar: "values", prompt: "When there's conflict, you:", scoring: "ordinal",
    options: ["Talk it through right away", "Take some space, then talk", "Let it pass"] },
  { id: "ambition", pillar: "values", prompt: "Your next five years at work:", scoring: "ordinal",
    options: ["Building fast", "Steady growth", "Balance over ambition"] },

  // Lifestyle
  { id: "social_energy", pillar: "lifestyle", prompt: "On weekends you're usually:", scoring: "ordinal",
    options: ["Home and recharging", "A mix", "Out most weekends"] },
  { id: "drinking", pillar: "lifestyle", prompt: "Do you drink?", scoring: "ordinal", dealbreakerable: true,
    options: ["Never", "Socially", "Regularly"] },
  { id: "smoking", pillar: "lifestyle", prompt: "Do you smoke?", scoring: "ordinal", dealbreakerable: true,
    options: ["Never", "Occasionally", "Regularly"] },
  { id: "fitness", pillar: "lifestyle", prompt: "How active are you?", scoring: "ordinal",
    options: ["Very active", "Somewhat active", "Not very active"] },
  { id: "texting", pillar: "lifestyle", prompt: "Texting during the day:", scoring: "ordinal",
    options: ["Constant check-ins", "A few times a day", "Mostly when we meet"] },
  { id: "care", pillar: "lifestyle", prompt: "How do you most show care?", scoring: "category",
    options: ["Words", "Time together", "Doing things for them", "Gifts", "Physical affection"] },
];

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const DEALBREAKER_QUESTIONS = QUESTIONS.filter((q) => q.dealbreakerable);

export const PILLAR_LABELS: Record<Pillar, string> = {
  intent: "Intent & timeline",
  values: "Values, faith & family",
  lifestyle: "Everyday life",
};

export type Answers = Record<string, number>;

export function validateAnswers(input: Record<string, unknown>): Answers | string {
  const out: Answers = {};
  for (const q of QUESTIONS) {
    const raw = input[q.id];
    const v = typeof raw === "string" ? Number.parseInt(raw, 10) : raw;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v >= q.options.length) {
      return `Please answer: ${q.prompt}`;
    }
    out[q.id] = v;
  }
  return out;
}
