import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { MATCHES_PER_MONTH, MEMBERSHIP_DAYS, MEMBERSHIP_PRICE_KES, mockIntegrations } from "@/lib/config";
import { activeSeason } from "@/lib/services/payments";
import { formatNairobi } from "@/lib/time";
import { PayButton } from "../PayButton";
import { GiftForm } from "./SeasonForms";

export default async function MembershipPage() {
  const me = await requireMember();
  if (me.reviewStatus !== "approved") redirect("/app");
  const current = await activeSeason(me.id);
  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <p className="eyebrow">{current ? "Renew" : "You\u2019re in"}</p>
        <h1 className="text-3xl">{current ? "Renew your membership" : "Start your membership"}</h1>
        {current && (
          <p className="notice">Your current month runs until {formatNairobi(current.endsAt)}. Renewing now adds {MEMBERSHIP_DAYS} days after that.</p>
        )}
        <ul className="space-y-2 text-muted">
          <li><strong className="text-ink">Up to {MATCHES_PER_MONTH} matches a month</strong>, chosen by a matchmaker and released on Thursdays</li>
          <li>If someone passes on you, that match doesn&apos;t count: you get the chance back</li>
          <li>Voice intros, guided first conversations and vetted date venues</li>
          <li>No auto-debit. We text you a few days before your month ends</li>
        </ul>
        <PayButton kind="season_pass" label={`Pay KES ${MEMBERSHIP_PRICE_KES.toLocaleString()} for ${MEMBERSHIP_DAYS} days`} mock={mockIntegrations()} doneHref="/app" />
      </div>
      {!current && <div className="card"><GiftForm /></div>}
    </div>
  );
}
