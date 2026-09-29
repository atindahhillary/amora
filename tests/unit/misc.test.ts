import { describe, expect, it } from "vitest";
import { normalizeKenyanPhone } from "@/lib/phone";
import { ageOn, nairobiMonth, nextDropAt } from "@/lib/time";
import { ghostCandidates, standingScore, standingTier } from "@/lib/standing";
import { darajaTimestamp, parseStkCallback } from "@/lib/integrations/mpesa";
import { validateAnswers, QUESTIONS } from "@/lib/questions";
import { nextStep } from "@/lib/steps";

describe("normalizeKenyanPhone", () => {
  it.each([
    ["0712345678", "254712345678"],
    ["+254 712 345 678", "254712345678"],
    ["254112345678", "254112345678"],
    ["712-345-678", "254712345678"],
  ])("%s -> %s", (input, out) => expect(normalizeKenyanPhone(input)).toBe(out));
  it.each(["0812345678", "12345", "+1 415 555 0100", ""])("rejects %s", (input) => {
    expect(normalizeKenyanPhone(input)).toBeNull();
  });
});

describe("nextDropAt", () => {
  // Thursday 18:00 Nairobi = 15:00 UTC
  it("returns this Thursday when it's earlier in the week", () => {
    expect(nextDropAt(new Date("2026-10-05T09:00:00Z")).toISOString()).toBe("2026-10-08T15:00:00.000Z"); // Monday
  });
  it("returns today at 18:00 on a Thursday morning", () => {
    expect(nextDropAt(new Date("2026-10-08T06:00:00Z")).toISOString()).toBe("2026-10-08T15:00:00.000Z");
  });
  it("rolls to next week once the drop has passed", () => {
    expect(nextDropAt(new Date("2026-10-08T15:00:00Z")).toISOString()).toBe("2026-10-15T15:00:00.000Z");
  });
  it("uses Nairobi's date, not UTC's, near midnight", () => {
    // Wednesday 22:30 UTC is already Thursday 01:30 in Nairobi
    expect(nextDropAt(new Date("2026-10-07T22:30:00Z")).toISOString()).toBe("2026-10-08T15:00:00.000Z");
  });
});

describe("nairobiMonth", () => {
  it("uses Nairobi's calendar month, not UTC's", () => {
    // 30 Sep 22:00 UTC is already 1 Oct 01:00 in Nairobi
    const m = nairobiMonth(new Date("2026-09-30T22:00:00Z"));
    expect(m.start.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(m.end.toISOString()).toBe("2026-10-31T21:00:00.000Z");
  });
  it("rolls over the year", () => {
    const m = nairobiMonth(new Date("2026-12-15T12:00:00Z"));
    expect(m.end.toISOString()).toBe("2026-12-31T21:00:00.000Z");
  });
});

describe("ageOn", () => {
  it("counts birthdays correctly", () => {
    expect(ageOn(new Date("2000-10-10"), new Date("2026-10-09"))).toBe(25);
    expect(ageOn(new Date("2000-10-10"), new Date("2026-10-10"))).toBe(26);
  });
});

describe("standing", () => {
  it("starts at 100, is capped, and never goes below 0", () => {
    expect(standingScore([])).toBe(100);
    expect(standingScore([2, 3])).toBe(100);
    expect(standingScore([-10, 2])).toBe(92);
    expect(standingScore([-25, -25, -25, -25, -25])).toBe(0);
  });
  it("maps scores to tiers", () => {
    expect(standingTier(100)).toBe("good");
    expect(standingTier(80)).toBe("attention");
    expect(standingTier(60)).toBe("review");
  });
});

describe("ghostCandidates", () => {
  const expires = new Date("2026-10-10T12:00:00Z");
  const recent = new Date("2026-10-09T12:00:00Z");
  const old = new Date("2026-10-05T12:00:00Z");
  it("flags only the person who went quiet on someone still engaging", () => {
    expect(ghostCandidates(["a", "b"], new Map([["a", recent], ["b", old]]), expires, 72)).toEqual(["b"]);
    expect(ghostCandidates(["a", "b"], new Map([["a", recent], ["b", null]]), expires, 72)).toEqual(["b"]);
  });
  it("flags nobody when both went quiet or both were active", () => {
    expect(ghostCandidates(["a", "b"], new Map([["a", old], ["b", null]]), expires, 72)).toEqual([]);
    expect(ghostCandidates(["a", "b"], new Map([["a", recent], ["b", recent]]), expires, 72)).toEqual([]);
  });
});

describe("M-Pesa", () => {
  it("formats the Daraja timestamp in Nairobi time", () => {
    expect(darajaTimestamp(new Date("2026-10-08T21:05:09Z"))).toBe("20261009000509");
  });
  it("parses a successful STK callback", () => {
    const cb = parseStkCallback({
      Body: { stkCallback: {
        MerchantRequestID: "m", CheckoutRequestID: "ws_CO_1", ResultCode: 0, ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: { Item: [{ Name: "Amount", Value: 300 }, { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" }, { Name: "PhoneNumber", Value: 254712345678 }] },
      } },
    });
    expect(cb).toEqual({ checkoutRequestId: "ws_CO_1", success: true, resultDesc: "The service request is processed successfully.", receipt: "NLJ7RT61SV", amount: 300 });
  });
  it("parses a cancelled STK callback", () => {
    const cb = parseStkCallback({ Body: { stkCallback: { CheckoutRequestID: "ws_CO_2", ResultCode: 1032, ResultDesc: "Request cancelled by user" } } });
    expect(cb?.success).toBe(false);
    expect(cb?.receipt).toBeNull();
  });
  it("rejects malformed bodies", () => {
    expect(parseStkCallback({})).toBeNull();
    expect(parseStkCallback(null)).toBeNull();
  });
});

describe("validateAnswers", () => {
  it("accepts a complete, in-range form", () => {
    const form = Object.fromEntries(QUESTIONS.map((q) => [q.id, "0"]));
    expect(typeof validateAnswers(form)).toBe("object");
  });
  it("rejects missing or out-of-range answers", () => {
    const form: Record<string, unknown> = Object.fromEntries(QUESTIONS.map((q) => [q.id, "0"]));
    form.faith = "99";
    expect(validateAnswers(form)).toMatch(/faith/);
  });
});

describe("nextStep", () => {
  const blank = { feePaidAt: null, idVerifiedAt: null, questionnaireDoneAt: null, vettingDoneAt: null, voiceDoneAt: null, profileApprovedAt: null, reviewStatus: "pending" as const };
  const d = new Date();
  it("puts the fee before the ID check", () => expect(nextStep(blank, false)).toBe("fee"));
  it("asks the vetting questions after the questionnaire", () => {
    expect(nextStep({ ...blank, feePaidAt: d, idVerifiedAt: d, questionnaireDoneAt: d }, false)).toBe("vetting");
    expect(nextStep({ ...blank, feePaidAt: d, idVerifiedAt: d, questionnaireDoneAt: d, vettingDoneAt: d }, false)).toBe("voice");
  });
  it("waits for review after the profile", () => {
    expect(nextStep({ ...blank, feePaidAt: d, idVerifiedAt: d, questionnaireDoneAt: d, vettingDoneAt: d, voiceDoneAt: d, profileApprovedAt: d }, false)).toBe("review");
  });
  it("asks for a membership once approved", () => {
    const all = { feePaidAt: d, idVerifiedAt: d, questionnaireDoneAt: d, vettingDoneAt: d, voiceDoneAt: d, profileApprovedAt: d, reviewStatus: "approved" as const };
    expect(nextStep(all, false)).toBe("season");
    expect(nextStep(all, true)).toBe("ready");
  });
  it("doesn't lock out members approved before vetting existed", () => {
    const old = { feePaidAt: d, idVerifiedAt: d, questionnaireDoneAt: d, vettingDoneAt: null, voiceDoneAt: d, profileApprovedAt: d, reviewStatus: "approved" as const };
    expect(nextStep(old, true)).toBe("ready");
  });
});

describe("vetting questions", () => {
  it("has 25 questions with unique ids across 6 sections", async () => {
    const { VETTING_SECTIONS, VETTING_QUESTIONS } = await import("@/lib/vetting");
    expect(VETTING_SECTIONS).toHaveLength(6);
    expect(VETTING_QUESTIONS).toHaveLength(25);
    expect(new Set(VETTING_QUESTIONS.map((q) => q.id)).size).toBe(25);
  });
});
