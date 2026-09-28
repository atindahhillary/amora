"use client";

import { useActionState } from "react";
import { applyAction } from "../actions";
import { SubmitButton } from "@/components/SubmitButton";
import { AGE_MAX, AGE_MIN } from "@/lib/config";

export function ApplyForm() {
  const [state, action] = useActionState(applyAction, undefined);
  return (
    <form action={action} className="card space-y-5">
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="firstName">First name</label>
          <input className="input" id="firstName" name="firstName" autoComplete="given-name" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">M-Pesa phone number</label>
          <input className="input" id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="0712 345 678" required />
        </div>
        <div>
          <label className="label" htmlFor="birthDate">Date of birth</label>
          <input className="input" id="birthDate" name="birthDate" type="date" required />
          <p className="hint">Season 1 is for ages {AGE_MIN} to {AGE_MAX}. Your ID check confirms this.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="gender">I am a</label>
            <select className="input" id="gender" name="gender" required defaultValue="">
              <option value="" disabled>Choose</option>
              <option value="woman">Woman</option>
              <option value="man">Man</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="seeking">Looking to meet a</label>
            <select className="input" id="seeking" name="seeking" required defaultValue="">
              <option value="" disabled>Choose</option>
              <option value="man">Man</option>
              <option value="woman">Woman</option>
            </select>
          </div>
        </div>
        <div>
          <span className="label">Ages you&apos;d like to meet</span>
          <div className="flex items-center gap-2">
            <input className="input" name="prefAgeMin" type="number" min={AGE_MIN} max={AGE_MAX} defaultValue={AGE_MIN} aria-label="Youngest" />
            <span className="text-muted">to</span>
            <input className="input" name="prefAgeMax" type="number" min={AGE_MIN} max={AGE_MAX} defaultValue={AGE_MAX} aria-label="Oldest" />
          </div>
        </div>
      </div>

      <fieldset className="space-y-3 border-t border-line pt-5">
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="intent" value="serious" required className="mt-0.5 accent-wine" />
          <span>I&apos;m looking for a committed relationship, not something casual.</span>
        </label>
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="consentData" required className="mt-0.5 accent-wine" />
          <span>I agree to Amora processing my data to run this service, as described in the privacy notice. I can export or delete it at any time.</span>
        </label>
        <label className="flex gap-3 text-sm">
          <input type="checkbox" name="consentSensitive" required className="mt-0.5 accent-wine" />
          <span>I explicitly consent to a biometric identity check and to Amora using my relationship preferences for matching. These are sensitive personal data under the Kenya Data Protection Act, 2019.</span>
        </label>
      </fieldset>

      <SubmitButton pendingText="Sending code…">Continue</SubmitButton>
    </form>
  );
}
