import Anthropic from "@anthropic-ai/sdk";
import { PILLAR_LABELS, QUESTION_BY_ID, type Answers, type Pillar } from "../questions";

// Claude drafts two things, and a person approves both before anyone sees them:
//   1. a member's profile, which the member edits and approves
//   2. the "Why this match" note, which the matchmaker edits and approves

const MODEL = "claude-opus-5-5";

function describe(answers: Answers): string {
  return Object.entries(answers)
    .map(([qid, v]) => {
      const q = QUESTION_BY_ID.get(qid);
      return q ? `- ${q.prompt} ${q.options[v]}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

async function generate(system: string, prompt: string): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low" },
      // Retry declined requests on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: prompt }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("").trim();
    return text || null;
  } catch (err) {
    console.error("Claude request failed", err);
    return null;
  }
}

const PROFILE_SYSTEM = `You write short dating profiles for Amora, a curated, marriage-minded matchmaking service in Nairobi.
Write in first person, warm and plain, 60 to 90 words, no emojis, no hashtags, no clichés like "partner in crime" or "love to laugh".
Use only what the answers say. Never mention or guess ethnicity, tribe, income or appearance.
Return only the profile text.`;

export async function draftProfile(firstName: string, answers: Answers): Promise<string> {
  const text = await generate(PROFILE_SYSTEM, `Name: ${firstName}\nQuestionnaire answers:\n${describe(answers)}`);
  return text ?? fallbackProfile(answers);
}

function fallbackProfile(a: Answers): string {
  const opt = (id: string) => QUESTION_BY_ID.get(id)!.options[a[id]].toLowerCase();
  return [
    `I'm here for ${opt("intent")}.`,
    `Faith is ${opt("faith_importance")} in my daily life, and when it comes to money I'm ${opt("money_style")}.`,
    `Most weekends I'm ${opt("social_energy")}.`,
    `When there's conflict I ${opt("conflict")}, and I most show care through ${opt("care")}.`,
  ].join(" ");
}

const WHY_SYSTEM = `You write the "Why this match" note for Amora, a curated matchmaking service in Nairobi.
Two to three sentences, addressed to both people ("You both..."), specific and concrete, no hype, no emojis.
Use only the shared answers given. Never mention ethnicity, tribe, income or appearance.
Return only the note.`;

export async function draftWhy(
  shared: string[],
  answers: Answers,
  pillars: Record<Pillar, number>,
): Promise<string> {
  const lines = shared
    .map((qid) => {
      const q = QUESTION_BY_ID.get(qid);
      return q ? `- ${q.prompt} Both answered: ${q.options[answers[qid]]}` : null;
    })
    .filter(Boolean)
    .join("\n");
  const scores = (Object.keys(pillars) as Pillar[]).map((p) => `${PILLAR_LABELS[p]}: ${pillars[p]}%`).join(", ");
  const text = await generate(WHY_SYSTEM, `Questions where they gave identical answers:\n${lines}\nPillar scores: ${scores}`);
  return text ?? fallbackWhy(pillars);
}

function fallbackWhy(p: Record<Pillar, number>): string {
  const best = (Object.keys(p) as Pillar[]).sort((x, y) => p[y] - p[x])[0];
  return `You're most aligned on ${PILLAR_LABELS[best].toLowerCase()}. Start with your voice intros and see where it goes.`;
}
