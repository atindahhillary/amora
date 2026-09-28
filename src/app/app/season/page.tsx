import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { MET_SOMEONE_REFUND_KES, SEASON_DAYS, SEASON_PRICE_KES, mockIntegrations } from "@/lib/config";
import { activeSeason } from "@/lib/services/payments";
import { PayButton } from "../PayButton";
import { GiftForm } from "./SeasonForms";

export default async function SeasonPage() {
  const me = await requireMember();
  if (me.reviewStatus !== "approved") redirect("/app");
  if (await activeSeason(me.id)) redirect("/app");
  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <p className="eyebrow">You&apos;re in</p>
        <h1 className="text-2xl font-semibold">Start your season</h1>
        <ul className="space-y-2 text-muted">
          <li><strong className="text-ink">{SEASON_DAYS} days</strong> of curated matches, delivered every Thursday</li>
          <li>Voice intros, guided first conversations and vetted date venues</li>
          <li>Met someone and leaving early? Get KES {MET_SOMEONE_REFUND_KES.toLocaleString()} back, or gift a season to a friend</li>
        </ul>
        <PayButton kind="season_pass" label={`Pay KES ${SEASON_PRICE_KES.toLocaleString()} with M-Pesa`} mock={mockIntegrations()} doneHref="/app" />
      </div>
      <div className="card"><GiftForm /></div>
    </div>
  );
}
