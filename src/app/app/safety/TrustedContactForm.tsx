"use client";

import { useActionState } from "react";
import { trustedContactAction } from "../account-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function TrustedContactForm({ name, phone }: { name: string; phone: string }) {
  const [state, action] = useActionState(trustedContactAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Their name</label>
          <input className="input" id="name" name="name" defaultValue={name} />
        </div>
        <div>
          <label className="label" htmlFor="phone">Their phone</label>
          <input className="input" id="phone" name="phone" inputMode="tel" defaultValue={phone} placeholder="0712 345 678" />
        </div>
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="notice">{state.ok}</p>}
      <SubmitButton className="btn-ghost">Save trusted contact</SubmitButton>
    </form>
  );
}
