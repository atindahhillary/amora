"use client";

import { useActionState } from "react";
import { identityAction } from "../onboarding-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function IdentityForm({ mock }: { mock: boolean }) {
  const [state, action] = useActionState(identityAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      {mock && (
        <p className="notice">Test mode: the selfie and ID capture are skipped and any valid-looking ID number passes.</p>
      )}
      <div>
        <label className="label" htmlFor="idNumber">National ID number</label>
        <input className="input" id="idNumber" name="idNumber" inputMode="numeric" autoComplete="off" required />
        <p className="hint">We store a one-way fingerprint of this number to stop duplicate accounts, never the number itself.</p>
      </div>
      <SubmitButton pendingText="Verifying…">Verify my identity</SubmitButton>
    </form>
  );
}
