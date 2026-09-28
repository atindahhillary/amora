"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { answerPromptAction, closeAction, planDateAction, sendMessageAction } from "../../match-actions";
import { SubmitButton } from "@/components/SubmitButton";

export function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

export function PromptForm({ conversationId, index }: { conversationId: string; index: number }) {
  const [state, action] = useActionState(answerPromptAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="promptIndex" value={index} />
      <textarea name="body" className="input min-h-20" maxLength={600} required placeholder="Your answer" />
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton className="btn-ghost">Share answer</SubmitButton>
    </form>
  );
}

export function MessageForm({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState(sendMessageAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={async (f) => { await action(f); ref.current?.reset(); }} className="flex items-end gap-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <textarea name="body" className="input min-h-11 flex-1 resize-none" rows={1} maxLength={2000} placeholder="Write a message" required
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ref.current?.requestSubmit(); } }} />
      <SubmitButton pendingText="…">Send</SubmitButton>
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}

export function CloseForm({ conversationId, templates, otherName }: { conversationId: string; templates: readonly string[]; otherName: string }) {
  const [state, action] = useActionState(closeAction, undefined);
  const [mode, setMode] = useState<"none" | "respectful" | "safety">("none");
  if (mode === "none") {
    return (
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => setMode("respectful")}>Close respectfully</button>
        <button className="btn-quiet text-alert" onClick={() => setMode("safety")}>I feel unsafe</button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <input type="hidden" name="kind" value={mode} />
      {mode === "respectful" ? (
        <>
          <p className="text-sm text-muted">{otherName} will see this message. Closing never counts against your Standing.</p>
          {templates.map((t, i) => (
            <label key={i} className="flex gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-wine">
              <input type="radio" name="template" value={i} defaultChecked={i === 0} className="mt-0.5 accent-wine" />
              {t}
            </label>
          ))}
        </>
      ) : (
        <>
          <p className="text-sm text-muted">
            We&apos;ll end the conversation, block {otherName}, and a person on our team will review what happened.
            {otherName} won&apos;t be told you reported them. If you&apos;re in danger now, call 999 or 112.
          </p>
          <select name="reason" className="input" required defaultValue="">
            <option value="" disabled>What happened?</option>
            <option value="harassment">Harassment or abusive messages</option>
            <option value="sexual">Unwanted sexual content</option>
            <option value="money">Asked me for money</option>
            <option value="fake">I think this profile is fake</option>
            <option value="other">Something else</option>
          </select>
          <textarea name="details" className="input min-h-20" placeholder="Anything else we should know (optional)" maxLength={2000} />
        </>
      )}
      {state?.error && <p className="error">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton className={mode === "safety" ? "btn-primary bg-alert hover:bg-alert" : "btn-primary"}>
          {mode === "safety" ? "End, block and report" : "Send and close"}
        </SubmitButton>
        <button type="button" className="btn-quiet" onClick={() => setMode("none")}>Cancel</button>
      </div>
    </form>
  );
}

export function PlanDateForm({ conversationId, venues }: { conversationId: string; venues: { id: number; name: string; area: string; kind: string }[] }) {
  const [state, action] = useActionState(planDateAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="venueId">Partner venue</label>
          <select className="input" id="venueId" name="venueId" required defaultValue="">
            <option value="" disabled>Choose a venue</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.area} ({v.kind})</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="startsAt">Date and time</label>
          <input className="input" id="startsAt" name="startsAt" type="datetime-local" required />
        </div>
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.ok && <p className="notice">{state.ok}</p>}
      <SubmitButton className="btn-ghost">Suggest this date</SubmitButton>
    </form>
  );
}
