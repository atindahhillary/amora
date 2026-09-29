"use client";

import { useActionState, useState } from "react";
import { acceptGiftAction, createGiftAction } from "../gift-actions";
import { PayButton } from "../PayButton";
import { SubmitButton } from "@/components/SubmitButton";
import { GiftArt } from "@/components/GiftArt";
import type { GiftItem } from "@/lib/services/gifts";

export function SendGiftForm({
  items,
  recipients,
  defaultTo,
  mock,
}: {
  items: GiftItem[];
  recipients: { id: string; firstName: string }[];
  defaultTo?: string;
  mock: boolean;
}) {
  const [state, action] = useActionState(createGiftAction, undefined);
  const [itemId, setItemId] = useState<number | null>(null);
  const chosen = items.find((i) => i.id === itemId);

  if (state?.giftId) {
    return (
      <div className="space-y-3">
        <p className="notice">
          {state.itemName} · KES {state.priceKes?.toLocaleString()}. Once you pay, they&apos;ll be asked to accept it and
          tell us where to deliver. You won&apos;t see their address, and if they decline you&apos;re refunded in full.
        </p>
        <PayButton kind="gift" giftId={state.giftId} label={`Pay KES ${state.priceKes?.toLocaleString()} with M-Pesa`} mock={mock} doneHref="/app/gifts?sent=1" />
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="label">Choose a gift</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((i) => (
            <label key={i.id} className="cursor-pointer">
              <input type="radio" name="itemId" value={i.id} required className="peer sr-only" onChange={() => setItemId(i.id)} />
              <span className="flex h-full flex-col items-center gap-2 rounded-2xl border border-line bg-card p-3 text-center transition peer-checked:border-wine peer-checked:bg-blush/60 peer-checked:shadow-md peer-focus-visible:ring-2 peer-focus-visible:ring-wine">
                <GiftArt category={i.category} className="h-16 w-16" />
                <span className="font-serif text-lg leading-tight font-semibold text-wine-dark">{i.name}</span>
                <span className="text-xs text-muted">{i.description}</span>
                <span className="mt-auto text-sm font-semibold">KES {i.priceKes.toLocaleString()}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <input type="hidden" name="itemName" value={chosen?.name ?? ""} />
      <div>
        <label className="label" htmlFor="conversationId">Send to</label>
        <select className="input" id="conversationId" name="conversationId" required defaultValue={defaultTo ?? ""}>
          <option value="" disabled>Choose someone you&apos;re talking to</option>
          {recipients.map((r) => <option key={r.id} value={r.id}>{r.firstName}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="note">A short note (optional)</label>
        <textarea className="input min-h-20" id="note" name="note" maxLength={200} placeholder="Written on the card that comes with it" />
      </div>
      {state?.error && <p className="error" role="alert">{state.error}</p>}
      <SubmitButton>Continue to payment</SubmitButton>
    </form>
  );
}

export function AcceptGiftForm({ giftId }: { giftId: string }) {
  const [state, action] = useActionState(acceptGiftAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="giftId" value={giftId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <div>
          <label className="label" htmlFor={`area-${giftId}`}>Area</label>
          <input className="input" id={`area-${giftId}`} name="area" placeholder="e.g. Kilimani" required maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor={`details-${giftId}`}>Where to deliver</label>
          <input className="input" id={`details-${giftId}`} name="details" placeholder="Office reception, building name, best time" required maxLength={300} />
        </div>
      </div>
      <p className="hint">Only Amora and our florist see this, and we delete it once the gift is delivered. A workplace or pickup point is fine.</p>
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton>Accept gift</SubmitButton>
    </form>
  );
}
