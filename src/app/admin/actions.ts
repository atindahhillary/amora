"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sendSms } from "@/lib/integrations/sms";
import { exclusionReason, scorePair } from "@/lib/matching";
import { loadCandidates, getSetting, remainingQuota, setSetting } from "@/lib/services/matching";
import { recordStanding } from "@/lib/services/standing";
import { nextDropAt } from "@/lib/time";

export type FormState = { error?: string } | undefined;

export async function reviewMemberAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(form.get("memberId"));
  const decision = String(form.get("decision"));
  if (!["approved", "waitlisted", "rejected"].includes(decision)) return;
  const [m] = await sql<{ phone: string; firstName: string }[]>`
    update members set review_status = ${decision}, reviewed_at = now()
    where id = ${id} and profile_approved_at is not null returning phone, first_name`;
  if (!m) return;
  const text = {
    approved: `Hi ${m.firstName}, you're in! Your Amora application is approved. Start your season in the app to get your first matches.`,
    waitlisted: `Hi ${m.firstName}, thanks for applying to Amora. We're opening places in balanced groups and you're on the waitlist. We'll text you when your place opens.`,
    rejected: `Hi ${m.firstName}, thank you for applying to Amora. We can't offer you a place this season. Your application fee will be refunded.`,
  }[decision]!;
  await sendSms(m.phone, text);
  if (decision === "rejected") {
    await sql`update payments set status = 'refund_requested' where member_id = ${id} and kind = 'application_fee' and status = 'paid'`;
  }
  console.info(`member ${id} ${decision} by ${admin.id}`);
  revalidatePath("/admin/members");
}

export async function removeMemberAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = String(form.get("memberId"));
  await sql`update members set account_status = 'removed' where id = ${id} and role <> 'admin'`;
  await sql`delete from sessions where member_id = ${id}`;
  revalidatePath("/admin");
}

export async function toggleMatchingAction(form: FormData): Promise<void> {
  await requireAdmin();
  await setSetting("matching_open", String(form.get("open")) === "true");
  revalidatePath("/admin");
}

export async function approvePairAction(_: FormState, form: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  if (!(await getSetting("matching_open", false))) return { error: "Matching isn't open yet. Open it on the overview once both sides have enough people." };
  const ids = [String(form.get("a")), String(form.get("b"))].sort();
  const why = String(form.get("why") ?? "").trim();
  if (why.length < 20) return { error: "Write a proper note: it's the first thing they read." };

  const candidates = await loadCandidates();
  const a = candidates.find((c) => c.id === ids[0]);
  const b = candidates.find((c) => c.id === ids[1]);
  if (!a || !b) return { error: "One of them is no longer active this season." };
  const excluded = exclusionReason(a, b);
  if (excluded) return { error: `They can't be matched (${excluded}).` };
  const [blocked] = await sql`
    select 1 from blocks where (blocker_id = ${a.id} and blocked_id = ${b.id}) or (blocker_id = ${b.id} and blocked_id = ${a.id})`;
  if (blocked) return { error: "One of them has blocked the other." };

  const drop = nextDropAt();
  const quota = await remainingQuota(drop, [a.id, b.id]);
  if ((quota.get(a.id) ?? 0) <= 0 || (quota.get(b.id) ?? 0) <= 0) return { error: "One of them already has this week's matches." };
  const score = scorePair(a, b);
  const [row] = await sql`
    insert into matches (member_a, member_b, score, pillars, why, drop_at, approved_by)
    values (${a.id}, ${b.id}, ${score.total}, ${sql.json(score.pillars)}, ${why}, ${drop}, ${admin.id})
    on conflict (member_a, member_b) do nothing returning id`;
  if (!row) return { error: "These two have already been matched before." };
  redirect("/admin/matching?approved=1");
}

export async function withdrawMatchAction(form: FormData): Promise<void> {
  await requireAdmin();
  await sql`delete from matches where id = ${String(form.get("matchId"))} and drop_at > now()`;
  revalidatePath("/admin/matching");
}

export async function reviewStandingAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const decision = String(form.get("decision"));
  if (decision !== "applied" && decision !== "dismissed") return;
  await sql`
    update standing_events set status = ${decision}, reviewed_by = ${admin.id}, reviewed_at = now()
    where id = ${Number(form.get("eventId"))} and status = 'proposed'`;
  revalidatePath("/admin/standing");
}

export async function resolveReportAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const decision = String(form.get("decision"));
  if (decision !== "upheld" && decision !== "dismissed") return;
  const [r] = await sql<{ reportedId: string; conversationId: string | null; reason: string }[]>`
    update reports set status = ${decision}, resolved_by = ${admin.id}, resolved_at = now()
    where id = ${Number(form.get("reportId"))} and status = 'open' returning reported_id, conversation_id, reason`;
  if (r && decision === "upheld" && r.reason !== "date_help") {
    await recordStanding(r.reportedId, "report_upheld", "A report about your behaviour was reviewed and upheld.",
      r.conversationId, admin.id);
  }
  revalidatePath("/admin/reports");
}

export async function addVenueAction(form: FormData): Promise<void> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const area = String(form.get("area") ?? "").trim();
  const kind = String(form.get("kind") ?? "").trim();
  if (!name || !area || !kind) return;
  await sql`insert into venues (name, area, kind, notes) values (${name}, ${area}, ${kind}, ${String(form.get("notes") ?? "").trim() || null})`;
  revalidatePath("/admin/venues");
}

export async function toggleVenueAction(form: FormData): Promise<void> {
  await requireAdmin();
  await sql`update venues set active = not active where id = ${Number(form.get("venueId"))}`;
  revalidatePath("/admin/venues");
}

export async function markRefundedAction(form: FormData): Promise<void> {
  await requireAdmin();
  await sql`update payments set status = 'refunded' where id = ${String(form.get("paymentId"))} and status = 'refund_requested'`;
  revalidatePath("/admin/payments");
}
