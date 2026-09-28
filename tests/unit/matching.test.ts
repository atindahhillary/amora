import { describe, expect, it } from "vitest";
import { exclusionReason, pairKey, proposeWeek, rankPairs, scorePair, type Candidate } from "@/lib/matching";
import { QUESTIONS } from "@/lib/questions";

function person(id: string, over: Partial<Candidate> = {}, answers: Record<string, number> = {}): Candidate {
  const base = Object.fromEntries(QUESTIONS.map((q) => [q.id, 0]));
  return {
    id, gender: "woman", seeking: "man", age: 30, prefAgeMin: 25, prefAgeMax: 40,
    dealbreakers: [], ...over, answers: { ...base, ...answers },
  };
}
const man = (id: string, over: Partial<Candidate> = {}, answers: Record<string, number> = {}) =>
  person(id, { gender: "man", seeking: "woman", ...over }, answers);

describe("exclusionReason", () => {
  it("allows a compatible pair", () => {
    expect(exclusionReason(person("a"), man("b"))).toBeNull();
  });

  it("requires mutual orientation", () => {
    expect(exclusionReason(person("a"), person("b"))).toBe("orientation");
    expect(exclusionReason(person("a"), man("b", { seeking: "man" }))).toBe("orientation");
  });

  it("respects both people's age preferences", () => {
    expect(exclusionReason(person("a", { prefAgeMax: 29 }), man("b", { age: 32 }))).toBe("age");
    expect(exclusionReason(person("a", { age: 38 }), man("b", { prefAgeMax: 35 }))).toBe("age");
  });

  it("enforces self-declared dealbreakers in either direction", () => {
    const a = person("a", { dealbreakers: ["smoking"] }, { smoking: 0 });
    expect(exclusionReason(a, man("b", {}, { smoking: 2 }))).toBe("dealbreaker:smoking");
    expect(exclusionReason(man("b", {}, { smoking: 2 }), a)).toBe("dealbreaker:smoking");
  });

  it("treats flexible answers as compatible with a dealbreaker", () => {
    const a = person("a", { dealbreakers: ["children_want"] }, { children_want: 0 });
    expect(exclusionReason(a, man("b", {}, { children_want: 1 }))).toBeNull(); // "Open to it"
    expect(exclusionReason(a, man("b", {}, { children_want: 2 }))).toBe("dealbreaker:children_want");
  });

  it("ignores dealbreakers on questions that don't allow them", () => {
    const a = person("a", { dealbreakers: ["fitness"] }, { fitness: 0 });
    expect(exclusionReason(a, man("b", {}, { fitness: 2 }))).toBeNull();
  });

  it("makes faith a dealbreaker when someone wants the same faith", () => {
    const a = person("a", {}, { partner_faith: 0, faith: 0 });
    expect(exclusionReason(a, man("b", {}, { faith: 1 }))).toBe("partner_faith");
    expect(exclusionReason(person("a", {}, { partner_faith: 2, faith: 0 }), man("b", {}, { faith: 1, partner_faith: 1 }))).toBeNull();
  });

  it("respects 'not open to a partner with children'", () => {
    const a = person("a", {}, { partner_children: 2 });
    expect(exclusionReason(a, man("b", {}, { children_have: 1 }))).toBe("partner_children");
    expect(exclusionReason(a, man("b", {}, { children_have: 0 }))).toBeNull();
  });

  it("rejects incomplete questionnaires", () => {
    const b = man("b");
    delete b.answers.faith;
    expect(exclusionReason(person("a"), b)).toBe("incomplete");
  });
});

describe("scorePair", () => {
  it("scores identical answers at 100", () => {
    const s = scorePair(person("a"), man("b"));
    expect(s.total).toBe(100);
    expect(s.pillars).toEqual({ intent: 100, values: 100, lifestyle: 100 });
  });

  it("gives partial credit on ordinal scales but not on categories", () => {
    const near = scorePair(person("a"), man("b", {}, { social_energy: 1 })).pillars.lifestyle;
    const far = scorePair(person("a"), man("b", {}, { social_energy: 2 })).pillars.lifestyle;
    expect(near).toBeGreaterThan(far);
    const cat = scorePair(person("a"), man("b", {}, { care: 1 })).pillars.lifestyle;
    const cat2 = scorePair(person("a"), man("b", {}, { care: 4 })).pillars.lifestyle;
    expect(cat).toBe(cat2);
  });

  it("weights intent above lifestyle", () => {
    const intentOff = scorePair(person("a"), man("b", {}, { intent: 2, timeline: 2 })).total;
    const lifeOff = scorePair(person("a"), man("b", {}, { social_energy: 2, fitness: 2 })).total;
    expect(intentOff).toBeLessThan(lifeOff);
  });

  it("never scores unscored questions", () => {
    const s = scorePair(person("a"), man("b", {}, { children_have: 1, partner_faith: 2 }));
    expect(s.total).toBe(100);
  });
});

describe("rankPairs and proposeWeek", () => {
  const women = [person("w1"), person("w2", {}, { intent: 2, timeline: 2 })];
  const men = [man("m1"), man("m2", {}, { social_energy: 2 })];

  it("ranks only compatible pairs, best first, with sorted ids", () => {
    const ranked = rankPairs([...women, ...men]);
    expect(ranked).toHaveLength(4);
    expect(ranked[0].score.total).toBeGreaterThanOrEqual(ranked[3].score.total);
    for (const r of ranked) expect(r.a.id < r.b.id).toBe(true);
  });

  it("skips pairs already matched or blocked", () => {
    const ranked = rankPairs([...women, ...men], new Set([pairKey("w1", "m1")]));
    expect(ranked.some((r) => r.a.id === "m1" && r.b.id === "w1")).toBe(false);
  });

  it("never exceeds anyone's weekly quota", () => {
    const ranked = rankPairs([...women, ...men]);
    const quota = new Map([["w1", 1], ["w2", 1], ["m1", 1], ["m2", 1]]);
    const picked = proposeWeek(ranked, quota);
    const counts = new Map<string, number>();
    for (const p of picked) for (const id of [p.a.id, p.b.id]) counts.set(id, (counts.get(id) ?? 0) + 1);
    expect(Math.max(...counts.values())).toBe(1);
    expect(picked).toHaveLength(2);
  });

  it("serves members with few compatible options first", () => {
    // w1 only accepts m1 (same faith). w2 is compatible with both men and scores higher with m1.
    const w1 = person("w1", {}, { partner_faith: 0, faith: 0, social_energy: 2 });
    const w2 = person("w2", {}, { partner_faith: 2 });
    const m1 = man("m1", {}, { partner_faith: 2 });
    const m2 = man("m2", {}, { partner_faith: 2, faith: 1, social_energy: 1 });
    const ranked = rankPairs([w1, w2, m1, m2]);
    expect(ranked[0].score.total).toBeGreaterThan(ranked.find((r) => r.a.id === "m1" && r.b.id === "w1")!.score.total);
    const picked = proposeWeek(ranked, new Map([["w1", 1], ["w2", 1], ["m1", 1], ["m2", 1]]));
    const ids = picked.map((p) => pairKey(p.a.id, p.b.id));
    expect(ids).toContain(pairKey("w1", "m1"));
    expect(ids).toContain(pairKey("w2", "m2"));
  });
});
