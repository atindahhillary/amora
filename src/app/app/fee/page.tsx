import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { APPLICATION_FEE_KES, mockIntegrations } from "@/lib/config";
import { maskPhone } from "@/lib/phone";
import { PayButton } from "../PayButton";

export default async function FeePage() {
  const me = await requireMember();
  if (me.feePaidAt) redirect("/app");
  return (
    <div className="card space-y-4">
      <p className="eyebrow">Step 1</p>
      <h1 className="text-2xl font-semibold">Application fee: KES {APPLICATION_FEE_KES}</h1>
      <p className="text-muted">
        The fee keeps out fake and casual accounts and covers your identity check. If we can&apos;t offer you a
        place this season, it&apos;s refunded in full.
      </p>
      <p className="text-sm">We&apos;ll send an M-Pesa request to <strong>{maskPhone(me.phone)}</strong>.</p>
      <PayButton kind="application_fee" label={`Pay KES ${APPLICATION_FEE_KES} with M-Pesa`} mock={mockIntegrations()} doneHref="/app/identity" />
    </div>
  );
}
