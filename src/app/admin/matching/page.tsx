import Link from "next/link";
import { sql } from "@/lib/db";
import { proposeWeek } from "@/lib/matching";
import { getSetting, rankedForDrop } from "@/lib/services/matching";
import { formatNairobi, nextDropAt } from "@/lib/time";
import { withdrawMatchAction } from "../actions";

export default async function MatchingPage({ searchParams }: { searchParams: Promise<{ approved?: string }> }) {
  const { approved } = await searchParams;
  const drop = nextDropAt();
  const open = await getSetting("matching_open", false);
  const { candidates, ranked, quota } = await rankedForDrop(drop);
  const proposals = proposeWeek(ranked, quota);
  const unmatched = candidates.filter((c) => (quota.get(c.id) ?? 0) > 0 && !proposals.some((p) => p.a.id === c.id || p.b.id === c.id));
  const names = new Map((await sql<{ id: string; firstName: string }[]>`select id, first_name from members where review_status = 'approved'`).map((r) => [r.id, r.firstName]));
  const queued = await sql<{ id: string; memberA: string; memberB: string; score: number; why: string }[]>`
    select id, member_a, member_b, score, why from matches where drop_at = ${drop} order by score desc`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl">Matching for {formatNairobi(drop)}</h1>
        <p className="mt-1 text-muted">
          {candidates.length} members in a season. Suggestions below are the best pairs that fit everyone&apos;s weekly quota.
          You approve each one and write the note they&apos;ll read.
        </p>
      </div>
      {!open && <p className="error">Matching is closed. Open it from the overview once both sides have enough members.</p>}
      {approved && <p className="notice">Match approved and queued for the drop.</p>}

      <section className="card">
        <p className="eyebrow">Suggested pairs</p>
        {proposals.length === 0 ? <p className="mt-2 text-sm text-muted">No compatible pairs with quota left.</p> : (
          <table className="data-table mt-2">
            <thead><tr><th>Pair</th><th>Score</th><th>Intent</th><th>Values</th><th>Life</th><th /></tr></thead>
            <tbody>
              {proposals.map((p) => (
                <tr key={`${p.a.id}${p.b.id}`}>
                  <td>{names.get(p.a.id)} ({p.a.age}) &amp; {names.get(p.b.id)} ({p.b.age})</td>
                  <td className="font-medium tabular-nums">{p.score.total}</td>
                  <td className="tabular-nums">{p.score.pillars.intent}</td>
                  <td className="tabular-nums">{p.score.pillars.values}</td>
                  <td className="tabular-nums">{p.score.pillars.lifestyle}</td>
                  <td><Link className="btn-ghost py-1.5" href={`/admin/matching/pair?a=${p.a.id}&b=${p.b.id}`}>Review</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {unmatched.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            No compatible pair this week for: {unmatched.map((c) => names.get(c.id)).join(", ")}. Check their dealbreakers,
            or look for density gaps in their age range.
          </p>
        )}
      </section>

      <section className="card">
        <p className="eyebrow">Queued for this drop ({queued.length})</p>
        <ul className="mt-2 divide-y divide-line">
          {queued.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-4 py-3 text-sm">
              <div>
                <p className="font-medium">{names.get(m.memberA)} &amp; {names.get(m.memberB)} · {m.score}</p>
                <p className="text-muted">{m.why}</p>
              </div>
              <form action={withdrawMatchAction}>
                <input type="hidden" name="matchId" value={m.id} />
                <button className="btn-quiet">Withdraw</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
