import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { VETTING_QUESTIONS } from "@/lib/vetting";
import { VettingForm } from "./VettingForm";

export default async function VettingPage() {
  const me = await requireMember();
  if (!me.questionnaireDoneAt) redirect("/app");
  const rows = await sql<{ questionId: string; body: string }[]>`
    select question_id, body from vetting_answers where member_id = ${me.id}`;
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Step 4 · {VETTING_QUESTIONS.length} questions</p>
        <h1 className="mt-1 text-4xl">In your own <em>words</em></h1>
        <p className="mt-2 text-muted">
          These help your matchmaker understand what you&apos;re really looking for. Only Amora&apos;s matchmakers read
          them. They&apos;re never shown to your matches. A sentence or two for each is enough, and you can save and
          come back.
        </p>
      </div>
      <VettingForm saved={Object.fromEntries(rows.map((r) => [r.questionId, r.body]))} />
    </div>
  );
}
