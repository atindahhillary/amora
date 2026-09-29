"use client";

import { useActionState, useState } from "react";
import { exitSeasonAction } from "../season-actions";
import { deleteAccountAction } from "../account-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ExitSeasonForm() {
  const [state, action] = useActionState(exitSeasonAction, undefined);
  const [reason, setReason] = useState("");
  return (
    <form action={action} className="space-y-3">
      <select name="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} required>
        <option value="" disabled>Why are you leaving?</option>
        <option value="met_someone">I met someone 🎉</option>
        <option value="taking_a_break">I&apos;m taking a break</option>
        <option value="not_for_me">Amora isn&apos;t for me</option>
      </select>
      {reason === "met_someone" && (
        <p className="notice">You&apos;ll get a code for a free month to give to a friend who&apos;s looking.</p>
      )}
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn-ghost">Cancel membership</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="label" htmlFor="confirm">Type DELETE to permanently delete your account and data</label>
      <input className="input" id="confirm" name="confirm" autoComplete="off" />
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn-ghost text-alert">Delete my account</SubmitButton>
    </form>
  );
}
