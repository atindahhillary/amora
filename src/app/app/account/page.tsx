import { requireMember } from "@/lib/auth";
import { maskPhone } from "@/lib/phone";
import { activeSeason } from "@/lib/services/payments";
import { formatNairobi } from "@/lib/time";
import { resumeAction } from "../season-actions";
import { DeleteAccountForm, ExitSeasonForm } from "./forms";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ left?: string; gift?: string }> }) {
  const me = await requireMember();
  const { left, gift } = await searchParams;
  const season = await activeSeason(me.id);
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Account</h1>
      {left === "met_someone" && (
        <div className="notice space-y-1">
          <p className="font-medium">Congratulations. This is what Amora is for.</p>
          {gift ? <p>Your friend&apos;s gift code is <strong className="tracking-wider">{gift}</strong>. They enter it when they start their season.</p>
                : <p>Your refund will reach your M-Pesa within 5 working days.</p>}
        </div>
      )}
      <div className="card space-y-1 text-sm">
        <p><span className="text-muted">Name:</span> {me.firstName}</p>
        <p><span className="text-muted">Phone:</span> {maskPhone(me.phone)}</p>
        <p><span className="text-muted">Season:</span> {season ? `active until ${formatNairobi(season.endsAt)}` : "none active"}</p>
        <p><span className="text-muted">Status:</span> {me.accountStatus}</p>
      </div>
      {(me.accountStatus === "paused" || me.accountStatus === "exited") && (
        <form action={resumeAction} className="card flex items-center justify-between gap-3">
          <p className="text-sm">You&apos;re not receiving matches.</p>
          <button className="btn-primary">Resume matching</button>
        </form>
      )}
      {season && (
        <div className="card space-y-3">
          <p className="eyebrow">Leave your season</p>
          <ExitSeasonForm />
        </div>
      )}
      <div className="card space-y-3">
        <p className="eyebrow">Your data</p>
        <p className="text-sm text-muted">Download everything we hold about you, or delete it. These are your rights under the Kenya Data Protection Act.</p>
        <a href="/api/account/export" className="btn-ghost">Download my data (JSON)</a>
        <div className="border-t border-line pt-4"><DeleteAccountForm /></div>
      </div>
    </div>
  );
}
