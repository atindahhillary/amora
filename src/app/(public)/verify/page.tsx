import { redirect } from "next/navigation";
import { VerifyForm } from "./VerifyForm";
import { resendAction } from "../actions";
import { maskPhone, normalizeKenyanPhone } from "@/lib/phone";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ phone?: string; dev?: string }> }) {
  const { phone: raw, dev } = await searchParams;
  const phone = normalizeKenyanPhone(raw ?? "");
  if (!phone) redirect("/login");
  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="card space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Check your messages</h1>
          <p className="mt-1 text-muted">We sent a code to {maskPhone(phone)}.</p>
        </div>
        {dev && (
          <p className="notice">
            Test mode: no SMS was sent. Your code is <strong className="tracking-widest">{dev}</strong>
          </p>
        )}
        <VerifyForm phone={phone} />
        <form action={resendAction}>
          <input type="hidden" name="phone" value={phone} />
          <button className="btn-quiet px-0">Send a new code</button>
        </form>
      </div>
    </div>
  );
}
