import { SubmitButton } from "@/components/SubmitButton";
import { sql } from "@/lib/db";
import { STANDING_RULES, type StandingKind } from "@/lib/standing";
import { reviewStandingAction } from "../actions";

export default async function StandingReviewPage() {
  const rows = await sql<{ id: number; kind: StandingKind; delta: number; reason: string; firstName: string; conversationId: string | null; createdAt: Date }[]>`
    select e.id, e.kind, e.delta, e.reason, m.first_name, e.conversation_id, e.created_at
    from standing_events e join members m on m.id = e.member_id where e.status = 'proposed' order by e.created_at`;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Penalty review</h1>
        <p className="mt-1 text-muted">No penalty counts until someone here applies it. When in doubt, dismiss.</p>
      </div>
      {rows.length === 0 && <p className="notice">Nothing waiting.</p>}
      {rows.map((e) => (
        <div key={e.id} className="card flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-medium">{e.firstName}: {STANDING_RULES[e.kind]?.label} ({e.delta})</p>
            <p className="text-sm text-muted">{e.reason}</p>
            {e.conversationId && <p className="text-xs text-muted">Conversation {e.conversationId.slice(0, 8)}</p>}
          </div>
          <form action={reviewStandingAction} className="flex gap-2">
            <input type="hidden" name="eventId" value={e.id} />
            <SubmitButton name="decision" value="applied" className="btn-ghost">Apply</SubmitButton>
            <SubmitButton name="decision" value="dismissed" className="btn-quiet">Dismiss</SubmitButton>
          </form>
        </div>
      ))}
    </div>
  );
}
