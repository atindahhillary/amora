"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { draftProfile } from "@/lib/integrations/ai";
import type { Answers } from "@/lib/questions";
import { VETTING_BY_ID, VETTING_MAX_CHARS, VETTING_MIN_CHARS, VETTING_QUESTIONS } from "@/lib/vetting";

export type VettingState = { error?: string; saved?: string; missing?: string[] } | undefined;

// "Save progress" keeps whatever is filled in. "Submit" also checks every answer is complete.
export async function saveVettingAction(_: VettingState, form: FormData): Promise<VettingState> {
  const me = await requireMember();
  if (!me.questionnaireDoneAt) redirect("/app");
  const submit = form.get("intent") === "submit";

  const answers = new Map<string, string>();
  for (const q of VETTING_QUESTIONS) {
    const v = String(form.get(q.id) ?? "").trim().slice(0, VETTING_MAX_CHARS);
    if (v) answers.set(q.id, v);
  }
  await sql.begin(async (tx) => {
    for (const [qid, body] of answers) {
      await tx`
        insert into vetting_answers (member_id, question_id, body) values (${me.id}, ${qid}, ${body})
        on conflict (member_id, question_id) do update set body = excluded.body, updated_at = now()`;
    }
  });

  if (!submit) {
    revalidatePath("/app/vetting");
    return { saved: `Saved ${answers.size} of ${VETTING_QUESTIONS.length}. You can come back and finish any time.` };
  }
  const missing = VETTING_QUESTIONS.filter((q) => (answers.get(q.id)?.length ?? 0) < VETTING_MIN_CHARS).map((q) => q.id);
  if (missing.length) {
    return {
      error: `${missing.length} ${missing.length === 1 ? "answer needs" : "answers need"} a little more: at least a sentence or two each. Your progress is saved.`,
      missing,
    };
  }

  await sql`update members set vetting_done_at = coalesce(vetting_done_at, now()) where id = ${me.id}`;
  // Refresh the profile draft with their own words, unless they've already approved a profile.
  if (!me.profileApprovedAt) {
    const rows = await sql<{ questionId: string; value: number }[]>`select question_id, value from answers where member_id = ${me.id}`;
    const choices: Answers = Object.fromEntries(rows.map((r) => [r.questionId, r.value]));
    const ownWords = ["intent_type", "intent_showing_up", "values_top3", "shared_connect"]
      .map((id) => answers.get(id) && `${VETTING_BY_ID.get(id)!.prompt} ${answers.get(id)}`)
      .filter((x): x is string => Boolean(x));
    await sql`update members set profile_draft = ${await draftProfile(me.firstName, choices, ownWords)} where id = ${me.id}`;
  }
  redirect(me.reviewStatus === "approved" ? "/app" : me.voiceDoneAt ? "/app/profile" : "/app/voice");
}
