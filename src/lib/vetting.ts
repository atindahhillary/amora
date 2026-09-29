// Open-ended vetting questions. Answers are read by matchmakers at application
// review and when approving a pair. They are never shown to matches.

export interface VettingQuestion {
  id: string;
  prompt: string;
  hint?: string;
}

export interface VettingSection {
  id: string;
  title: string;
  questions: VettingQuestion[];
}

export const VETTING_MIN_CHARS = 25;
export const VETTING_MAX_CHARS = 1500;

export const VETTING_SECTIONS: VettingSection[] = [
  {
    id: "intent",
    title: "Relationship intent & readiness",
    questions: [
      { id: "intent_type", prompt: "What type of committed relationship are you seeking (long-term, marriage, life partnership), and why now?" },
      { id: "intent_readiness", prompt: "What does emotional readiness for a relationship mean to you personally?" },
      { id: "intent_lesson", prompt: "What is the most important lesson you learned from past relationships, and how has it shaped your expectations?" },
      { id: "intent_showing_up", prompt: "What does “showing up” for your partner look like in your daily life?" },
      { id: "intent_fears", prompt: "What fears or concerns do you still carry about relationships, and how do you manage them?" },
    ],
  },
  {
    id: "communication",
    title: "Communication & emotional compatibility",
    questions: [
      { id: "comm_conflict", prompt: "How do you prefer to communicate during conflict, and what helps you stay calm and open?" },
      { id: "comm_safety", prompt: "What makes you feel emotionally safe and understood in a relationship?" },
      { id: "comm_frequency", prompt: "How often do you prefer to communicate with your partner throughout the day or week?" },
      { id: "comm_connected", prompt: "What behaviours from a partner make you feel deeply connected and valued?" },
      { id: "comm_withdraw", prompt: "What behaviours from a partner make you withdraw or feel insecure?" },
      { id: "comm_tension", prompt: "How do you typically respond when there is emotional tension or misunderstanding?" },
      { id: "comm_attachment", prompt: "What is your attachment style (secure, anxious, avoidant, unsure), and how does it show up in relationships?", hint: "“Unsure” is a fine answer. Tell us what you notice about yourself." },
      { id: "comm_vulnerability", prompt: "How important is emotional vulnerability to you, and how comfortable are you with sharing deeper feelings?" },
    ],
  },
  {
    id: "values",
    title: "Relationship values & expectations",
    questions: [
      { id: "values_top3", prompt: "What are your top three relationship values (for example loyalty, honesty, growth, partnership)?" },
      { id: "values_non_negotiables", prompt: "What are your non-negotiables: things you absolutely need in a relationship?" },
      { id: "values_dealbreakers", prompt: "What are your deal-breakers: things you cannot tolerate?" },
      { id: "values_shared_resp", prompt: "How do you view shared responsibilities in a relationship (finances, chores, emotional labour)?" },
      { id: "values_growth", prompt: "What role should a relationship play in your personal growth and life purpose?" },
    ],
  },
  {
    id: "family",
    title: "Children, parenting & family alignment",
    questions: [
      { id: "family_children", prompt: "Do you want children, and if so, what timeline feels right for you?" },
      { id: "family_parenting", prompt: "What parenting style aligns most with your values, and how important is it for your partner to share similar beliefs about discipline, education and emotional development?" },
    ],
  },
  {
    id: "shared",
    title: "Shared experience",
    questions: [
      { id: "shared_connect", prompt: "What types of dates, shared activities or experiences help you feel most connected to a partner, and what about those moments strengthens your emotional bond?" },
      { id: "shared_adventure", prompt: "How do shared adventure and travel fit into your ideal relationship, and how do trying new things or exploring new places help you build trust, intimacy and long-term alignment with a partner?" },
      { id: "shared_balance", prompt: "How do you envision balancing personal hobbies, shared interests, nights out, quiet nights in and time alone, and what do these rhythms mean for intimacy, connection and harmony as a couple?" },
    ],
  },
  {
    id: "marriage",
    title: "Marriage & expectations",
    questions: [
      { id: "marriage_meaning", prompt: "What does marriage mean to you emotionally and practically, and what kind of partnership do you hope to build within a marriage?" },
      { id: "marriage_separate", prompt: "Would you consider a marriage where partners live separately or keep separate spaces, and how could this support or challenge intimacy, independence and long-term connection?" },
    ],
  },
];

export const VETTING_QUESTIONS = VETTING_SECTIONS.flatMap((s) => s.questions);
export const VETTING_BY_ID = new Map(VETTING_QUESTIONS.map((q) => [q.id, q]));
