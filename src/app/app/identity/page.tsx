import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { mockIntegrations } from "@/lib/config";
import { IdentityForm } from "./IdentityForm";

export default async function IdentityPage() {
  const me = await requireMember();
  if (!me.feePaidAt) redirect("/app/fee");
  if (me.idVerifiedAt) redirect("/app");
  return (
    <div className="card space-y-4">
      <p className="eyebrow">Step 2</p>
      <h1 className="text-3xl">Verify your identity</h1>
      <p className="text-muted">
        You&apos;ll take a short selfie video and a photo of your national ID. Our verification partner, Smile ID,
        confirms it&apos;s really you. Amora never stores your ID images.
      </p>
      <ul className="list-inside list-disc text-sm text-muted">
        <li>Find good light and remove sunglasses or hats</li>
        <li>Have your national ID card with you</li>
      </ul>
      <IdentityForm mock={mockIntegrations()} />
    </div>
  );
}
