import { sql } from "@/lib/db";
import { VETTING_SECTIONS } from "@/lib/vetting";

// Matchmaker-only view of a member's vetting answers. Never render this on a member page.
export async function VettingAnswers({ memberId, name }: { memberId: string; name: string }) {
  const rows = await sql<{ questionId: string; body: string }[]>`
    select question_id, body from vetting_answers where member_id = ${memberId}`;
  const byId = new Map(rows.map((r) => [r.questionId, r.body]));
  if (byId.size === 0) return <p className="text-sm text-muted">{name} hasn&apos;t answered the vetting questions yet.</p>;
  return (
    <details className="rounded-2xl border border-line bg-paper/60 p-4 text-sm">
      <summary className="cursor-pointer font-medium text-wine-dark">
        {name}&apos;s answers in their own words ({byId.size})
      </summary>
      <div className="mt-3 space-y-4">
        {VETTING_SECTIONS.map((s) => (
          <div key={s.id} className="space-y-2">
            <p className="eyebrow">{s.title}</p>
            {s.questions.filter((q) => byId.has(q.id)).map((q) => (
              <div key={q.id}>
                <p className="text-muted">{q.prompt}</p>
                <p className="whitespace-pre-line">{byId.get(q.id)}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
