"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="error" role="alert">
          {state.error} {state.error.includes("application") && <Link href="/apply" className="underline">Apply here.</Link>}
        </p>
      )}
      <div>
        <label className="label" htmlFor="phone">Phone number</label>
        <input className="input" id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" required />
      </div>
      <SubmitButton pendingText="Sending code…">Send code</SubmitButton>
    </form>
  );
}
