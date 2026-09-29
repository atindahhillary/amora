"use client";

import { useActionState } from "react";
import { questionnaireAction } from "../onboarding-actions";
import { SubmitButton } from "@/components/SubmitButton";
import { PILLAR_LABELS, QUESTIONS, type Pillar } from "@/lib/questions";

export function QuestionnaireForm({ answers, dealbreakers }: { answers: Record<string, number>; dealbreakers: string[] }) {
  const [state, action] = useActionState(questionnaireAction, undefined);
  const pillars = Object.keys(PILLAR_LABELS) as Pillar[];
  return (
    <form action={action} className="space-y-8">
      {pillars.map((p) => (
        <section key={p} className="card space-y-6">
          <h2 className="text-2xl">{PILLAR_LABELS[p]}</h2>
          {QUESTIONS.filter((q) => q.pillar === p).map((q) => (
            <fieldset key={q.id} className="space-y-2">
              <legend className="font-medium">{q.prompt}</legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt, v) => (
                  <label key={v} className="cursor-pointer">
                    <input type="radio" name={q.id} value={v} defaultChecked={answers[q.id] === v} required className="peer sr-only" />
                    <span className="inline-block rounded-full border border-line px-3.5 py-1.5 text-sm peer-checked:border-wine peer-checked:bg-wine peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-wine">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
              {q.dealbreakerable && (
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input type="checkbox" name="dealbreaker" value={q.id} defaultChecked={dealbreakers.includes(q.id)} className="accent-wine" />
                  This is a dealbreaker for me
                </label>
              )}
            </fieldset>
          ))}
        </section>
      ))}
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <SubmitButton pendingText="Saving and drafting your profile…">Save answers</SubmitButton>
    </form>
  );
}
