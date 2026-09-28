import { mockIntegrations } from "../config";

// Safaricom Daraja, Lipa na M-Pesa Online (STK push).
// Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate

export interface StkPushResult {
  checkoutRequestId: string;
  mock: boolean;
}

function baseUrl() {
  return process.env.MPESA_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function accessToken(): Promise<string> {
  const auth = Buffer.from(`${required("MPESA_CONSUMER_KEY")}:${required("MPESA_CONSUMER_SECRET")}`).toString("base64");
  const res = await fetch(`${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Daraja auth failed: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export function darajaTimestamp(d: Date = new Date()): string {
  // Daraja expects Nairobi local time, YYYYMMDDHHmmss.
  const local = new Date(d.getTime() + 3 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${local.getUTCFullYear()}${p(local.getUTCMonth() + 1)}${p(local.getUTCDate())}${p(local.getUTCHours())}${p(local.getUTCMinutes())}${p(local.getUTCSeconds())}`;
}

export async function stkPush(opts: {
  phone: string;
  amountKes: number;
  reference: string;
  description: string;
}): Promise<StkPushResult> {
  if (mockIntegrations()) {
    return { checkoutRequestId: `mock_${crypto.randomUUID()}`, mock: true };
  }
  const shortcode = required("MPESA_SHORTCODE");
  const timestamp = darajaTimestamp();
  const password = Buffer.from(`${shortcode}${required("MPESA_PASSKEY")}${timestamp}`).toString("base64");
  const res = await fetch(`${baseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: opts.amountKes,
      PartyA: opts.phone,
      PartyB: shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: `${required("APP_URL")}/api/mpesa/callback?token=${required("MPESA_CALLBACK_TOKEN")}`,
      AccountReference: opts.reference.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });
  const json = (await res.json()) as { ResponseCode?: string; CheckoutRequestID?: string; errorMessage?: string };
  if (json.ResponseCode !== "0" || !json.CheckoutRequestID) {
    throw new Error(`M-Pesa request failed: ${json.errorMessage ?? res.status}`);
  }
  return { checkoutRequestId: json.CheckoutRequestID, mock: false };
}

export interface StkCallback {
  checkoutRequestId: string;
  success: boolean;
  resultDesc: string;
  receipt: string | null;
  amount: number | null;
}

// Parses the body Safaricom POSTs to CallBackURL.
export function parseStkCallback(body: unknown): StkCallback | null {
  const cb = (body as { Body?: { stkCallback?: Record<string, unknown> } })?.Body?.stkCallback;
  if (!cb || typeof cb.CheckoutRequestID !== "string") return null;
  const items =
    ((cb.CallbackMetadata as { Item?: { Name: string; Value?: string | number }[] } | undefined)?.Item) ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;
  const receipt = get("MpesaReceiptNumber");
  const amount = get("Amount");
  return {
    checkoutRequestId: cb.CheckoutRequestID,
    success: cb.ResultCode === 0 || cb.ResultCode === "0",
    resultDesc: String(cb.ResultDesc ?? ""),
    receipt: receipt === undefined ? null : String(receipt),
    amount: amount === undefined ? null : Number(amount),
  };
}
