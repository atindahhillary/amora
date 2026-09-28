import Link from "next/link";
import { notFound } from "next/navigation";
import { PillarBars } from "@/components/PillarBars";
import { sql } from "@/lib/db";
import { draftWhy } from "@/lib/integrations/ai";
import { exclusionReason, scorePair } from "@/lib/matching";
import { QUESTION_BY_ID } from "@/lib/questions";
import { loadCandidates } from "@/lib/services/matching";
import { ApproveForm } from "./ApproveForm";

export default async function PairPage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a: aId, b: bId } = await searchParams;
  const candidates = await loadCandidates();
  const a = candidates.find((c) => c.id === aId);
  const b = candidates.find((c) => c.id === bId);
  if (!a || !b) notFound();
  const excluded = exclusionReason(a, b);
  const score = scorePair(a, b);
  const people = await sql<{ id: string; firstName: string; profileBio: string }[]>`
    select id, first_name, profile_bio from members where id in (${a.id}, ${b.id})`;
  const draft = excluded ? "" : await draftWhy(score.strongest, a.answers, score.pillars);
  const differences = [...QUESTION_BY_ID.values()].filter((q) => q.scoring !== "none" && a.answers[q.id] !== b.answers[q.id]);

  return (
    <div className="space-y-5">
      <Link href="/admin/matching" className="btn-quiet px-0">← Matching</Link>
      <h1 className="text-3xl font-semibold">Review pair · {score.total}</h1>
      {excluded && <p className="error">This pair fails a hard filter: {excluded}</p>}
      {!excluded && score.pillars.intent < 60 && (
        <p className="error">Intent alignment is only {score.pillars.intent}%. They may want different things. Consider waiting a week for a better match.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {[a, b].map((c) => {
          const p = people.find((x) => x.id === c.id)!;
          return (
            <div key={c.id} className="card space-y-2">
              <h2 className="text-xl font-semibold">{p.firstName}, {c.age}</h2>
              <p className="text-sm whitespace-pre-line">{p.profileBio}</p>
              <audio controls preload="none" src={`/api/voice/${c.id}`} className="w-full" />
            </div>
          );
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card"><PillarBars pillars={score.pillars} /></div>
        <div className="card text-sm">
          <p className="eyebrow">Where they differ</p>
          <ul className="mt-2 space-y-1">
            {differences.map((q) => (
              <li key={q.id}><span className="text-muted">{q.prompt}</span> {q.options[a.answers[q.id]]} / {q.options[b.answers[q.id]]}</li>
            ))}
          </ul>
        </div>
      </div>
      {!excluded && <div className="card"><ApproveForm a={a.id} b={b.id} draft={draft} /></div>}
    </div>
  );
}
