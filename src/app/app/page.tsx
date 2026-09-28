import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { activeSeason } from "@/lib/services/payments";
import { STEP_LABELS, STEP_PATHS, nextStep, type Step } from "@/lib/steps";
import { formatNairobi, nextDropAt } from "@/lib/time";

const ORDER: Exclude<Step, "ready">[] = ["fee", "identity", "questionnaire", "voice", "profile", "review", "season"];

export default async function Home() {
  const me = await requireMember();
  const season = await activeSeason(me.id);
  const step = nextStep(me, !!season);

  if (step !== "ready") {
    const current = ORDER.indexOf(step);
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow">Your application</p>
          <h1 className="mt-1 text-3xl font-semibold">Hi {me.firstName}</h1>
        </div>
        {me.reviewStatus === "waitlisted" && (
          <p className="notice">You&apos;re on the waitlist. We open matching in balanced groups so everyone gets good matches, and we&apos;ll text you when your place opens.</p>
        )}
        {me.reviewStatus === "rejected" && (
          <p className="error">We can&apos;t offer you a place this season. Your application fee will be refunded to your M-Pesa number.</p>
        )}
        <ol className="card divide-y divide-line p-0 sm:p-0">
          {ORDER.map((s, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <li key={s} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-sage text-white" : active ? "bg-wine text-white" : "bg-blush text-muted"}`}>
                    {done ? "✓" : i + 1}
                  </span>
                  <span className={active ? "font-medium" : done ? "text-muted line-through" : "text-muted"}>{STEP_LABELS[s]}</span>
                </div>
                {active && s !== "review" && <Link href={STEP_PATHS[s]} className="btn-primary">Start</Link>}
                {active && s === "review" && me.reviewStatus === "pending" && <span className="pill">Usually 2 to 3 days</span>}
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const drop = nextDropAt();
  const [{ newMatches, openConversations }] = await sql<{ newMatches: number; openConversations: number }[]>`
    select
      (select count(*)::int from matches where drop_at <= now() and
        ((member_a = ${me.id} and a_response is null) or (member_b = ${me.id} and b_response is null))) as new_matches,
      (select count(*)::int from conversations c join matches m on m.id = c.match_id
        where c.status in ('open', 'date_planned') and (m.member_a = ${me.id} or m.member_b = ${me.id})) as open_conversations`;
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Season active until {formatNairobi(season!.endsAt)}</p>
        <h1 className="mt-1 text-3xl font-semibold">Hi {me.firstName}</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/app/matches" className="card block hover:border-wine">
          <p className="text-4xl font-semibold tabular-nums">{newMatches}</p>
          <p className="mt-1 text-muted">{newMatches === 1 ? "match waiting for you" : "matches waiting for you"}</p>
        </Link>
        <Link href="/app/matches" className="card block hover:border-wine">
          <p className="text-4xl font-semibold tabular-nums">{openConversations}</p>
          <p className="mt-1 text-muted">open conversations</p>
        </Link>
      </div>
      <p className="notice">Your next matches arrive <strong>{formatNairobi(drop)}</strong>. We&apos;ll text you.</p>
    </div>
  );
}
