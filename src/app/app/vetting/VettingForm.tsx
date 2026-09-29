"use client";

import { useActionState, useState } from "react";
import { saveVettingAction } from "../vetting-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { VETTING_MAX_CHARS, VETTING_MIN_CHARS, VETTING_SECTIONS } from "@/lib/vetting";

export function VettingForm({ saved }: { saved: Record<string, string> }) {
  const [state, action] = useActionState(saveVettingAction, undefined);
  const [lengths, setLengths] = useState<Record<string, number>>(
    Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, v.length])),
  );
  const total = VETTING_SECTIONS.reduce((n, s) => n + s.questions.length, 0);
  const done = Object.values(lengths).filter((n) => n >= VETTING_MIN_CHARS).length;
  const missing = new Set(state?.missing ?? []);

  return (
    <form action={action} className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 bg-paper/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{done} of {total} answered</span>
          <span className="text-muted">Press Save progress to keep your place</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-blush">
          <div className="h-1.5 rounded-full bg-linear-to-r from-jacaranda to-wine transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      {VETTING_SECTIONS.map((section, si) => (
        <section key={section.id} className="card space-y-5">
          <h2 className="text-2xl"><span className="text-gold">{si + 1}.</span> {section.title}</h2>
          {section.questions.map((q) => {
            const len = lengths[q.id] ?? 0;
            return (
              <div key={q.id}>
                <label htmlFor={q.id} className="block font-medium">{q.prompt}</label>
                {q.hint && <p className="hint">{q.hint}</p>}
                <textarea
                  id={q.id}
                  name={q.id}
                  defaultValue={saved[q.id] ?? ""}
                  maxLength={VETTING_MAX_CHARS}
                  onChange={(e) => setLengths((l) => ({ ...l, [q.id]: e.target.value.trim().length }))}
                  className={`input mt-2 min-h-24 ${missing.has(q.id) ? "border-alert" : ""}`}
                  aria-invalid={missing.has(q.id) || undefined}
                />
                <p className={`mt-1 text-right text-xs ${len >= VETTING_MIN_CHARS ? "text-sage" : "text-muted"}`}>
                  {len >= VETTING_MIN_CHARS ? "✓" : `${Math.max(0, VETTING_MIN_CHARS - len)} more characters`}
                </p>
              </div>
            );
          })}
        </section>
      ))}

      {state?.error && <p className="error" role="alert">{state.error}</p>}
      {state?.saved && <p className="notice" role="status">{state.saved}</p>}
      <div className="flex flex-wrap gap-3">
        <SubmitButton name="intent" value="submit" pendingText="Submitting…">Submit my answers</SubmitButton>
        <SubmitButton name="intent" value="save" className="btn-ghost" pendingText="Saving…">Save progress</SubmitButton>
      </div>
    </form>
  );
}
