import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { QUESTIONS } from "@/lib/questions";
import { QuestionnaireForm } from "./QuestionnaireForm";

export default async function QuestionnairePage() {
  const me = await requireMember();
  if (!me.idVerifiedAt) redirect("/app");
  const rows = await sql<{ questionId: string; value: number }[]>`select question_id, value from answers where member_id = ${me.id}`;
  const answers = Object.fromEntries(rows.map((r) => [r.questionId, r.value]));
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Step 3 · {QUESTIONS.length} questions</p>
        <h1 className="mt-1 text-3xl font-semibold">What you want, and how you live</h1>
        <p className="mt-2 text-muted">
          Answer honestly: this is what your matchmaker uses. Mark something as a dealbreaker only if you truly
          wouldn&apos;t date someone who answered differently. Nobody sees your individual answers.
        </p>
      </div>
      <QuestionnaireForm answers={answers} dealbreakers={me.dealbreakers} />
    </div>
  );
}
