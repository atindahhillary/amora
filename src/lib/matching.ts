import { AGE_MAX, AGE_MIN } from "./config";
import { QUESTIONS, QUESTION_BY_ID, type Answers, type Pillar } from "./questions";

export interface Candidate {
  id: string;
  gender: "woman" | "man";
  seeking: "woman" | "man";
  age: number;
  prefAgeMin: number;
  prefAgeMax: number;
  answers: Answers;
  dealbreakers: string[];
}

// Intent carries the most weight: Amora is for people who want the same outcome.
export const PILLAR_WEIGHTS: Record<Pillar, number> = { intent: 0.45, values: 0.35, lifestyle: 0.2 };

export type Exclusion =
  | "orientation"
  | "age"
  | "incomplete"
  | `dealbreaker:${string}`
  | "partner_faith"
  | "partner_children";

function dealbreakerFails(owner: Candidate, other: Candidate): string | null {
  for (const qid of owner.dealbreakers) {
    const q = QUESTION_BY_ID.get(qid);
    if (!q?.dealbreakerable) continue;
    const mine = owner.answers[qid];
    const theirs = other.answers[qid];
    if (mine === theirs) continue;
    if (q.flexible?.includes(theirs)) continue;
    return qid;
  }
  return null;
}

// Hard filters. Returns the first reason the pair can't be matched, or null.
export function exclusionReason(a: Candidate, b: Candidate): Exclusion | null {
  if (a.seeking !== b.gender || b.seeking !== a.gender) return "orientation";
  if (a.age < b.prefAgeMin || a.age > b.prefAgeMax) return "age";
  if (b.age < a.prefAgeMin || b.age > a.prefAgeMax) return "age";
  if (a.age < AGE_MIN || a.age > AGE_MAX || b.age < AGE_MIN || b.age > AGE_MAX) return "age";
  for (const q of QUESTIONS) {
    if (a.answers[q.id] === undefined || b.answers[q.id] === undefined) return "incomplete";
  }
  for (const [x, y] of [[a, b], [b, a]] as const) {
    const failed = dealbreakerFails(x, y);
    if (failed) return `dealbreaker:${failed}`;
    // "The same as mine" makes faith a dealbreaker automatically.
    if (x.answers.partner_faith === 0 && x.answers.faith !== y.answers.faith) return "partner_faith";
    if (x.answers.partner_children === 2 && y.answers.children_have === 1) return "partner_children";
  }
  return null;
}

function questionSimilarity(qid: string, a: number, b: number): number {
  const q = QUESTION_BY_ID.get(qid)!;
  if (q.scoring === "category") return a === b ? 1 : 0.3;
  return 1 - Math.abs(a - b) / (q.options.length - 1);
}

export interface Score {
  total: number; // 0 to 100
  pillars: Record<Pillar, number>; // 0 to 100 each
  strongest: string[]; // question ids with identical answers, most important pillar first
}

export function scorePair(a: Candidate, b: Candidate): Score {
  const sums: Record<Pillar, number[]> = { intent: [], values: [], lifestyle: [] };
  const strongest: string[] = [];
  for (const q of QUESTIONS) {
    if (q.scoring === "none") continue;
    const s = questionSimilarity(q.id, a.answers[q.id], b.answers[q.id]);
    sums[q.pillar].push(s);
    if (s === 1) strongest.push(q.id);
  }
  const pillars = {} as Record<Pillar, number>;
  let total = 0;
  for (const p of Object.keys(sums) as Pillar[]) {
    const avg = sums[p].reduce((x, y) => x + y, 0) / sums[p].length;
    pillars[p] = Math.round(avg * 100);
    total += avg * PILLAR_WEIGHTS[p];
  }
  return { total: Math.round(total * 100), pillars, strongest };
}

export interface RankedPair {
  a: Candidate;
  b: Candidate;
  score: Score;
}

// All compatible pairs, best first. `skip` lets the caller exclude previously
// matched or blocked pairs (key: sorted ids joined by ':').
export function rankPairs(members: Candidate[], skip: Set<string> = new Set()): RankedPair[] {
  const out: RankedPair[] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const [a, b] = members[i].id < members[j].id ? [members[i], members[j]] : [members[j], members[i]];
      if (skip.has(pairKey(a.id, b.id))) continue;
      if (exclusionReason(a, b)) continue;
      out.push({ a, b, score: scorePair(a, b) });
    }
  }
  return out.sort((x, y) => y.score.total - x.score.total);
}

export function pairKey(x: string, y: string): string {
  return x < y ? `${x}:${y}` : `${y}:${x}`;
}

// Weekly proposal. People with the fewest compatible options go first, so
// someone with strict dealbreakers isn't left out because their only good
// matches were given to people who had plenty of alternatives. Within that,
// better scores win. Nobody goes above their weekly quota.
export function proposeWeek(ranked: RankedPair[], remainingQuota: Map<string, number>): RankedPair[] {
  const left = new Map(remainingQuota);
  const options = new Map<string, number>();
  for (const { a, b } of ranked) {
    if ((left.get(a.id) ?? 0) <= 0 || (left.get(b.id) ?? 0) <= 0) continue;
    options.set(a.id, (options.get(a.id) ?? 0) + 1);
    options.set(b.id, (options.get(b.id) ?? 0) + 1);
  }
  const scarcity = (p: RankedPair) => Math.min(options.get(p.a.id) ?? 0, options.get(p.b.id) ?? 0);
  const order = [...ranked].sort((x, y) => scarcity(x) - scarcity(y) || y.score.total - x.score.total);

  const picked: RankedPair[] = [];
  for (const pair of order) {
    if ((left.get(pair.a.id) ?? 0) <= 0 || (left.get(pair.b.id) ?? 0) <= 0) continue;
    picked.push(pair);
    left.set(pair.a.id, left.get(pair.a.id)! - 1);
    left.set(pair.b.id, left.get(pair.b.id)! - 1);
  }
  return picked.sort((x, y) => y.score.total - x.score.total);
}
