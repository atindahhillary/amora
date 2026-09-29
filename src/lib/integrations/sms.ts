import { mockIntegrations } from "../config";
import { sql } from "../db";

// Africa's Talking SMS. In mock mode, messages only land in sms_outbox
// (visible at /admin/sms) so the whole flow can run without an account.
export async function sendSms(toPhone: string, body: string): Promise<void> {
  if (mockIntegrations()) {
    await sql`insert into sms_outbox (to_phone, body, provider, provider_status) values (${toPhone}, ${body}, 'mock', 'logged')`;
    return;
  }
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;
  if (!username || !apiKey) throw new Error("AT_USERNAME / AT_API_KEY are not set");
  const host = username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
  const form = new URLSearchParams({ username, to: `+${toPhone}`, message: body });
  if (process.env.AT_SENDER_ID) form.set("from", process.env.AT_SENDER_ID);

  let status = "error";
  try {
    const res = await fetch(`https://${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const json = (await res.json().catch(() => null)) as
      | { SMSMessageData?: { Recipients?: { status?: string }[] } }
      | null;
    status = json?.SMSMessageData?.Recipients?.[0]?.status ?? `http_${res.status}`;
  } finally {
    // Never store the body of OTP messages in production logs.
    const logged = /code is \d+/.test(body) ? "[verification code]" : body;
    await sql`insert into sms_outbox (to_phone, body, provider, provider_status) values (${toPhone}, ${logged}, 'africastalking', ${status})`;
  }
}
