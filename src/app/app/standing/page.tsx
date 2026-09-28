import { requireMember } from "@/lib/auth";
import { HELPS, HURTS, STANDING_RULES, TIER_COPY } from "@/lib/standing";
import { standingFor } from "@/lib/services/standing";

const TIER_STYLE = { good: "bg-sage", attention: "bg-amber", review: "bg-alert" } as const;

export default async function StandingPage() {
  const me = await requireMember();
  const { score, tier, events } = await standingFor(me.id);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold">Your Standing</h1>
        <p className="mt-1 text-muted">Private to you. Nobody else sees it, and there are no hidden penalties: everything that affects it is listed here.</p>
      </div>
      <div className="card flex items-center gap-5">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full text-xl font-semibold text-white ${TIER_STYLE[tier]}`}>{score}</span>
        <div>
          <p className="text-xl font-semibold">{TIER_COPY[tier].title}</p>
          <p className="text-muted">{TIER_COPY[tier].body}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="eyebrow text-sage">What helps</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">{HELPS.map((h) => <li key={h}>{h}</li>)}</ul>
        </div>
        <div className="card">
          <p className="eyebrow">What hurts</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">{HURTS.map((h) => <li key={h}>{h}</li>)}</ul>
          <p className="mt-3 text-xs text-muted">Every penalty is reviewed by a person before it counts. You&apos;ll see it here as &ldquo;under review&rdquo; first.</p>
        </div>
      </div>
      <div className="card">
        <p className="eyebrow">History</p>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-4 py-3 text-sm">
                <div>
                  <p>{STANDING_RULES[e.kind]?.label ?? e.kind}</p>
                  <p className="text-muted">{e.reason}</p>
                  {e.status === "proposed" && (
                    <p className="mt-1 text-xs text-amber">
                      Under review. Doesn&apos;t count yet. Think this is wrong? Reply to our SMS or email support and a person will look at it.
                    </p>
                  )}
                </div>
                <span className={`shrink-0 font-medium tabular-nums ${e.delta > 0 ? "text-sage" : "text-alert"}`}>
                  {e.delta > 0 ? `+${e.delta}` : e.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
