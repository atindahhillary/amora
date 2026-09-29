import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { parseStkCallback } from "@/lib/integrations/mpesa";
import { completePayment } from "@/lib/services/payments";

// Safaricom posts STK push results here. The secret token in the query string
// stops anyone else from faking a payment confirmation.
export async function POST(req: Request) {
  const expected = process.env.MPESA_CALLBACK_TOKEN ?? "";
  const given = new URL(req.url).searchParams.get("token") ?? "";
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Rejected" }, { status: 401 });
  }
  const cb = parseStkCallback(await req.json().catch(() => null));
  if (!cb) return NextResponse.json({ ResultCode: 1, ResultDesc: "Malformed" }, { status: 400 });
  await completePayment(cb);
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
