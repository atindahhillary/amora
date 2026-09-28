import { requireMember } from "@/lib/auth";
import { TrustedContactForm } from "./TrustedContactForm";

export default async function SafetyPage() {
  const me = await requireMember();
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Safety</h1>
      <div className="card space-y-3">
        <p className="eyebrow">Trusted contact</p>
        <p className="text-muted">
          When you confirm a date, we text this person where and when you&apos;re meeting. Your match&apos;s name is never
          shared. If you tap &ldquo;I need help&rdquo; during a date, we text them straight away.
        </p>
        <TrustedContactForm name={me.trustedContactName ?? ""} phone={me.trustedContactPhone ? `0${me.trustedContactPhone.slice(3)}` : ""} />
      </div>
      <div className="card space-y-2 text-sm">
        <p className="eyebrow">First-date guidelines</p>
        <ul className="list-inside list-disc space-y-1 text-muted">
          <li>Meet at one of our partner venues, in public, and get there on your own</li>
          <li>Never send money to a match, for any reason. Report anyone who asks</li>
          <li>Keep chatting on Amora until you&apos;ve met</li>
          <li>In an emergency call 999 or 112</li>
        </ul>
      </div>
    </div>
  );
}
