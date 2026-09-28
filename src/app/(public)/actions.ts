"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isAdminPhone, sendOtp, startSession, verifyOtp, endSession } from "@/lib/auth";
import { AGE_MAX, AGE_MIN } from "@/lib/config";
import { sql } from "@/lib/db";
import { normalizeKenyanPhone } from "@/lib/phone";
import { ageOn } from "@/lib/time";

export type FormState = { error?: string } | undefined;

const applySchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(40),
  phone: z.string().trim(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth"),
  gender: z.enum(["woman", "man"], { message: "Choose how you identify" }),
  seeking: z.enum(["woman", "man"], { message: "Choose who you'd like to meet" }),
  prefAgeMin: z.coerce.number().int(),
  prefAgeMax: z.coerce.number().int(),
  intent: z.literal("serious", { message: "Amora is only for people looking for a committed relationship" }),
  consentData: z.literal("on", { message: "Please agree to how we handle your data" }),
  consentSensitive: z.literal("on", { message: "Please consent to identity and preference processing" }),
});

function goVerify(phone: string, devCode?: string): never {
  const q = new URLSearchParams({ phone });
  if (devCode) q.set("dev", devCode);
  redirect(`/verify?${q}`);
}

export async function applyAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = applySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const phone = normalizeKenyanPhone(d.phone);
  if (!phone) return { error: "Enter a Kenyan mobile number, e.g. 0712 345 678" };

  const age = ageOn(new Date(`${d.birthDate}T00:00:00Z`));
  if (age < AGE_MIN || age > AGE_MAX) {
    return { error: `Season 1 is for people aged ${AGE_MIN} to ${AGE_MAX}. We'll open to more ages later.` };
  }
  const min = Math.max(AGE_MIN, d.prefAgeMin);
  const max = Math.min(AGE_MAX, d.prefAgeMax);
  if (min > max) return { error: "Check the age range you'd like to meet" };

  const [existing] = await sql`select id from members where phone = ${phone}`;
  if (!existing) {
    await sql`
      insert into members (phone, first_name, birth_date, gender, seeking, pref_age_min, pref_age_max, consented_at)
      values (${phone}, ${d.firstName}, ${d.birthDate}, ${d.gender}, ${d.seeking}, ${min}, ${max}, now())`;
  }
  const sent = await sendOtp(phone);
  if (!sent.ok) return { error: sent.error };
  goVerify(phone, sent.devCode);
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const phone = normalizeKenyanPhone(String(form.get("phone") ?? ""));
  if (!phone) return { error: "Enter a Kenyan mobile number, e.g. 0712 345 678" };
  const [existing] = await sql`select id from members where phone = ${phone} and account_status <> 'removed'`;
  if (!existing) return { error: "We don't have an application for that number yet." };
  const sent = await sendOtp(phone);
  if (!sent.ok) return { error: sent.error };
  goVerify(phone, sent.devCode);
}

export async function verifyAction(_: FormState, form: FormData): Promise<FormState> {
  const phone = normalizeKenyanPhone(String(form.get("phone") ?? ""));
  const code = String(form.get("code") ?? "");
  if (!phone || !/^\d{6}$/.test(code.trim())) return { error: "Enter the 6-digit code" };
  if (!(await verifyOtp(phone, code))) return { error: "That code is wrong or has expired" };

  const [m] = await sql<{ id: string }[]>`
    update members set phone_verified_at = coalesce(phone_verified_at, now()),
      role = case when ${isAdminPhone(phone)} then 'admin' else role end
    where phone = ${phone} and account_status <> 'removed' returning id`;
  if (!m) return { error: "We couldn't find your application" };
  await startSession(m.id);
  redirect("/app");
}

export async function resendAction(form: FormData): Promise<void> {
  const phone = normalizeKenyanPhone(String(form.get("phone") ?? ""));
  if (!phone) redirect("/login");
  const sent = await sendOtp(phone);
  goVerify(phone, sent.ok ? sent.devCode : undefined);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
