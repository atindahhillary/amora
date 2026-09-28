"use client";

import { useActionState } from "react";
import { redeemGiftAction } from "../season-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function GiftForm() {
  const [state, action] = useActionState(redeemGiftAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div className="min-w-48 flex-1">
        <label className="label" htmlFor="code">Have a gift code?</label>
        <input className="input uppercase" id="code" name="code" required />
      </div>
      <SubmitButton className="btn-ghost">Redeem</SubmitButton>
      {state?.error && <p className="error w-full" role="alert">{state.error}</p>}
    </form>
  );
}
