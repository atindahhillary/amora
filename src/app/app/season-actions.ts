"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { activeSeason, redeemGift } from "@/lib/services/payments";

export type FormState = { error?: string } | undefined;

export async function redeemGiftAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  if (me.reviewStatus !== "approved") return { error: "Your application hasn't been approved yet." };
  if (await activeSeason(me.id)) return { error: "You already have an active membership." };
  if (!(await redeemGift(me.id, String(form.get("code") ?? "")))) return { error: "That code isn't valid." };
  redirect("/app");
}

// Cancelling a membership. If you met someone, you get a free month to give a friend.
export async function exitSeasonAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  const season = await activeSeason(me.id);
  if (!season) return { error: "You don't have an active membership." };
  const reason = String(form.get("reason"));
  if (!["met_someone", "taking_a_break", "not_for_me"].includes(reason)) return { error: "Tell us why you're leaving" };
  // Monthly plans aren't refunded; meeting someone earns a free month for a friend instead.
  const choice = reason === "met_someone" ? "gift_season" : null;
  const gift = choice === "gift_season" ? randomBytes(4).toString("hex").toUpperCase() : null;
  await sql.begin(async (tx) => {
    await tx`
      update seasons set exited_at = now(), exit_reason = ${reason}, exit_choice = ${choice}, gift_code = ${gift}
      where id = ${season.id}`;
    await tx`update members set account_status = ${reason === "met_someone" ? "exited" : "paused"} where id = ${me.id}`;
  });
  redirect(`/app/account?left=${reason}${gift ? `&gift=${gift}` : ""}`);
}

export async function resumeAction(): Promise<void> {
  const me = await requireMember();
  await sql`update members set account_status = 'active' where id = ${me.id} and account_status in ('paused', 'exited')`;
  redirect("/app");
}
