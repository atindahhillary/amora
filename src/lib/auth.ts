import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { OTP_MAX_ATTEMPTS, OTP_MAX_PER_HOUR, OTP_TTL_MINUTES, SESSION_DAYS, mockIntegrations } from "./config";
import { sql } from "./db";
import { sendSms } from "./integrations/sms";

const COOKIE = "amora_session";

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export type OtpSendResult = { ok: true; devCode?: string } | { ok: false; error: string };

export async function sendOtp(phone: string): Promise<OtpSendResult> {
  const [{ count }] = await sql<{ count: number }[]>`
    select count(*)::int as count from otp_codes where phone = ${phone} and created_at > now() - interval '1 hour'`;
  if (count >= OTP_MAX_PER_HOUR) return { ok: false, error: "Too many codes requested. Try again in an hour." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sql`
    insert into otp_codes (phone, code_hash, expires_at)
    values (${phone}, ${sha256(`${phone}:${code}`)}, now() + make_interval(mins => ${OTP_TTL_MINUTES}))`;
  await sendSms(phone, `Your Amora code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`);
  // In mock mode there is no real SMS, so the code is shown on screen.
  return mockIntegrations() ? { ok: true, devCode: code } : { ok: true };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const [row] = await sql<{ id: number; codeHash: string; attempts: number }[]>`
    select id, code_hash, attempts from otp_codes
    where phone = ${phone} and consumed_at is null and expires_at > now()
    order by created_at desc limit 1`;
  if (!row || row.attempts >= OTP_MAX_ATTEMPTS) return false;
  await sql`update otp_codes set attempts = attempts + 1 where id = ${row.id}`;
  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(sha256(`${phone}:${code.trim()}`), "hex");
  if (!timingSafeEqual(expected, given)) return false;
  await sql`update otp_codes set consumed_at = now() where id = ${row.id}`;
  return true;
}

export async function startSession(memberId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await sql`
    insert into sessions (token_hash, member_id, expires_at)
    values (${sha256(token)}, ${memberId}, now() + make_interval(days => ${SESSION_DAYS}))`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`delete from sessions where token_hash = ${sha256(token)}`;
  jar.delete(COOKIE);
}

export interface Member {
  id: string;
  phone: string;
  firstName: string;
  birthDate: Date;
  gender: "woman" | "man";
  seeking: "woman" | "man";
  prefAgeMin: number;
  prefAgeMax: number;
  role: "member" | "admin";
  phoneVerifiedAt: Date | null;
  feePaidAt: Date | null;
  idVerifiedAt: Date | null;
  questionnaireDoneAt: Date | null;
  dealbreakers: string[];
  voiceDoneAt: Date | null;
  profileDraft: string | null;
  profileBio: string | null;
  profileApprovedAt: Date | null;
  reviewStatus: "pending" | "approved" | "waitlisted" | "rejected";
  accountStatus: "active" | "paused" | "removed" | "exited";
  trustedContactName: string | null;
  trustedContactPhone: string | null;
  createdAt: Date;
}

export async function currentMember(): Promise<Member | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [m] = await sql<Member[]>`
    select m.* from sessions s join members m on m.id = s.member_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()`;
  return m ?? null;
}

export async function requireMember(): Promise<Member> {
  const m = await currentMember();
  if (!m) redirect("/login");
  if (m.accountStatus === "removed") redirect("/login?removed=1");
  return m;
}

export async function requireAdmin(): Promise<Member> {
  const m = await requireMember();
  if (m.role !== "admin") redirect("/app");
  return m;
}

// Phones listed in ADMIN_PHONES become admins when they sign in.
export function isAdminPhone(phone: string): boolean {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.trim())
    .includes(phone);
}
