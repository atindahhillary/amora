"use client";

import { useActionState } from "react";
import { verifyAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

export function VerifyForm({ phone }: { phone: string }) {
  const [state, action] = useActionState(verifyAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <input type="hidden" name="phone" value={phone} />
      <div>
        <label className="label" htmlFor="code">6-digit code</label>
        <input className="input text-center text-2xl tracking-[0.4em]" id="code" name="code" inputMode="numeric"
          autoComplete="one-time-code" maxLength={6} pattern="\d{6}" required autoFocus />
      </div>
      <SubmitButton pendingText="Checking…">Verify</SubmitButton>
    </form>
  );
}
