"use client";

import { useActionState } from "react";
import { approvePairAction } from "../../actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ApproveForm({ a, b, draft }: { a: string; b: string; draft: string }) {
  const [state, action] = useActionState(approvePairAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="a" value={a} />
      <input type="hidden" name="b" value={b} />
      <label className="label" htmlFor="why">&ldquo;Why this match&rdquo; note (both will read it)</label>
      <textarea id="why" name="why" className="input min-h-28" defaultValue={draft} maxLength={600} required />
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton>Approve for the drop</SubmitButton>
    </form>
  );
}
