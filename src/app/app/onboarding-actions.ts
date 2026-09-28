"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { draftProfile } from "@/lib/integrations/ai";
import { isValidKenyanIdNumber, verifyIdentity } from "@/lib/integrations/identity";
import { DEALBREAKER_QUESTIONS, validateAnswers } from "@/lib/questions";

export type FormState = { error?: string } | undefined;

export async function identityAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  if (!me.feePaidAt) redirect("/app/fee");
  if (me.idVerifiedAt) redirect("/app");
  const idNumber = String(form.get("idNumber") ?? "");
  if (!isValidKenyanIdNumber(idNumber)) return { error: "Enter the number on your national ID (7 or 8 digits)" };

  let result;
  try {
    result = await verifyIdentity({ memberId: me.id, idNumber });
  } catch (err) {
    console.error(err);
    return { error: "Identity checks are unavailable right now. Please try again later." };
  }
  if (result.idNumberHash) {
    const [dupe] = await sql`
      select 1 from identity_checks where id_number_hash = ${result.idNumberHash} and member_id <> ${me.id}`;
    if (dupe) return { error: "This ID is already linked to another Amora account. Contact support if that's a mistake." };
  }
  await sql.begin(async (tx) => {
    await tx`
      insert into identity_checks (member_id, provider, job_id, result, id_number_hash)
      values (${me.id}, ${result.provider}, ${result.jobId}, ${result.result}, ${result.idNumberHash})
      on conflict (member_id) do update set provider = excluded.provider, job_id = excluded.job_id,
        result = excluded.result, id_number_hash = excluded.id_number_hash, checked_at = now()`;
    if (result.result === "passed") await tx`update members set id_verified_at = now() where id = ${me.id}`;
  });
  if (result.result === "failed") return { error: "We couldn't verify your identity. Make sure your selfie and ID are clear, then try again." };
  if (result.result === "pending") return { error: "Your check is still processing. We'll text you when it's done." };
  redirect("/app/questionnaire");
}

export async function questionnaireAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  if (!me.idVerifiedAt) redirect("/app");
  if (me.reviewStatus === "approved") return { error: "Your answers are locked while you're in a season. Contact us to change them." };
  const answers = validateAnswers(Object.fromEntries(form));
  if (typeof answers === "string") return { error: answers };
  const allowed = new Set(DEALBREAKER_QUESTIONS.map((q) => q.id));
  const dealbreakers = form.getAll("dealbreaker").map(String).filter((id) => allowed.has(id));

  await sql.begin(async (tx) => {
    for (const [qid, value] of Object.entries(answers)) {
      await tx`
        insert into answers (member_id, question_id, value) values (${me.id}, ${qid}, ${value})
        on conflict (member_id, question_id) do update set value = excluded.value`;
    }
    await tx`
      update members set questionnaire_done_at = now(), dealbreakers = ${dealbreakers},
        profile_approved_at = null where id = ${me.id}`;
  });
  const draft = await draftProfile(me.firstName, answers);
  await sql`update members set profile_draft = ${draft} where id = ${me.id}`;
  redirect(me.voiceDoneAt ? "/app/profile" : "/app/voice");
}

export async function approveProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  if (!me.questionnaireDoneAt || !me.voiceDoneAt) redirect("/app");
  const bio = String(form.get("bio") ?? "").trim();
  if (bio.length < 40) return { error: "Your profile needs at least a couple of sentences." };
  if (bio.length > 800) return { error: "Keep your profile under 800 characters." };
  if (/(\+?254|0)[17]\d{8}|@|https?:\/\//i.test(bio)) {
    return { error: "Please leave out phone numbers, handles and links. You can share them once you've met." };
  }
  await sql`update members set profile_bio = ${bio}, profile_approved_at = now() where id = ${me.id}`;
  redirect("/app");
}
