"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { normalizeKenyanPhone } from "@/lib/phone";

export type FormState = { error?: string; ok?: string } | undefined;

export async function trustedContactAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const raw = String(form.get("phone") ?? "").trim();
  if (!raw) {
    await sql`update members set trusted_contact_name = null, trusted_contact_phone = null where id = ${me.id}`;
    revalidatePath("/app/safety");
    return { ok: "Trusted contact removed." };
  }
  const phone = normalizeKenyanPhone(raw);
  if (!phone) return { error: "Enter a Kenyan mobile number" };
  if (phone === me.phone) return { error: "Your trusted contact should be someone else" };
  if (!name) return { error: "Enter their name" };
  await sql`update members set trusted_contact_name = ${name}, trusted_contact_phone = ${phone} where id = ${me.id}`;
  revalidatePath("/app/safety");
  return { ok: "Saved. We'll only message them when you confirm a date or ask for help." };
}

// Right to erasure. Everything is deleted by cascade except payment records, which
// keep the M-Pesa receipt but lose the link to the member (see the payments table).
export async function deleteAccountAction(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireMember();
  if (String(form.get("confirm")) !== "DELETE") return { error: "Type DELETE to confirm" };
  await sql`delete from members where id = ${me.id}`;
  await endSession();
  redirect("/?deleted=1");
}
