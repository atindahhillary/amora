"use client";

import { useActionState } from "react";
import { approveProfileAction } from "../onboarding-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ProfileForm({ draft }: { draft: string }) {
  const [state, action] = useActionState(approveProfileAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <textarea name="bio" className="input min-h-44 leading-relaxed" defaultValue={draft} maxLength={800} required />
      <SubmitButton pendingText="Saving…">Approve my profile</SubmitButton>
    </form>
  );
}
