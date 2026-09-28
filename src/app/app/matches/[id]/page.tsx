import Link from "next/link";
import { notFound } from "next/navigation";
import { PillarBars } from "@/components/PillarBars";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { myResponse, theirResponse, type MatchRow } from "@/lib/services/conversations";
import { ageOn } from "@/lib/time";
import { respondAction } from "../../match-actions";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [m] = await sql<MatchRow[]>`
    select * from matches where id = ${id} and (member_a = ${me.id} or member_b = ${me.id}) and drop_at <= now()`;
  if (!m) notFound();
  const otherId = m.memberA === me.id ? m.memberB : m.memberA;
  const [o] = await sql<{ firstName: string; birthDate: Date; profileBio: string }[]>`
    select first_name, birth_date, profile_bio from members where id = ${otherId}`;
  const [conv] = await sql<{ id: string }[]>`select id from conversations where match_id = ${m.id}`;
  const mine = myResponse(m, me.id);
  const final = mine === "accept" || mine === "pass";

  return (
    <article className="space-y-5">
      <Link href="/app/matches" className="btn-quiet px-0">← Matches</Link>
      <div className="card space-y-5">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold">{o.firstName}, {ageOn(o.birthDate)}</h1>
          <span className="pill">{m.score}% aligned</span>
        </div>
        <div className="rounded-xl bg-blush/50 p-4">
          <p className="eyebrow">Why this match</p>
          <p className="mt-2 font-serif text-lg leading-relaxed">{m.why}</p>
        </div>
        <PillarBars pillars={m.pillars} />
        <div>
          <p className="eyebrow">In their words</p>
          <p className="mt-2 leading-relaxed whitespace-pre-line">{o.profileBio}</p>
        </div>
      </div>

      {conv ? (
        <Link href={`/app/conversations/${conv.id}`} className="btn-primary">Go to your conversation</Link>
      ) : final ? (
        <p className="notice">
          {mine === "pass"
            ? "You passed on this match. They won't be told why."
            : theirResponse(m, me.id) === "pass"
              ? "It wasn't a match this time. That's the system working, not a judgement."
              : `You accepted. We'll text you when ${o.firstName} responds.`}
        </p>
      ) : (
        <form action={respondAction} className="card flex flex-wrap items-center gap-3">
          <input type="hidden" name="matchId" value={m.id} />
          <SubmitButton name="response" value="accept">Accept</SubmitButton>
          <SubmitButton name="response" value="pass" className="btn-ghost">Pass</SubmitButton>
          {mine !== "save" && <SubmitButton name="response" value="save" className="btn-quiet">Decide later</SubmitButton>}
          <p className="w-full text-xs text-muted">
            If you both accept, you&apos;ll swap voice intros and have 7 days to talk. Passing is private.
          </p>
        </form>
      )}
    </article>
  );
}
