import { SubmitButton } from "@/components/SubmitButton";
import { sql } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { QUESTION_BY_ID } from "@/lib/questions";
import { ageOn } from "@/lib/time";
import { removeMemberAction, reviewMemberAction } from "../actions";

interface Applicant {
  id: string; firstName: string; phone: string; birthDate: Date; gender: string; seeking: string;
  profileBio: string; dealbreakers: string[]; reviewStatus: string; idResult: string | null; intent: number | null;
}

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "pending" } = await searchParams;
  const rows = await sql<Applicant[]>`
    select m.id, m.first_name, m.phone, m.birth_date, m.gender, m.seeking, m.profile_bio, m.dealbreakers, m.review_status,
      ic.result as id_result, (select value from answers a where a.member_id = m.id and a.question_id = 'intent') as intent
    from members m left join identity_checks ic on ic.member_id = m.id
    where m.profile_approved_at is not null and m.review_status = ${status} and m.account_status <> 'removed'
    order by m.created_at limit 100`;
  const tabs = ["pending", "waitlisted", "approved", "rejected"];
  return (
    <div className="space-y-5">
      <h1 className="text-4xl">Applications</h1>
      <div className="flex gap-2">
        {tabs.map((t) => (
          <a key={t} href={`?status=${t}`} className={`pill capitalize ${t === status ? "bg-wine text-white" : ""}`}>{t}</a>
        ))}
      </div>
      {rows.length === 0 && <p className="notice">Nobody here.</p>}
      {rows.map((m) => (
        <article key={m.id} className="card space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl">{m.firstName}, {ageOn(m.birthDate)}</h2>
            <span className="text-sm text-muted">{m.gender} seeking {m.seeking} · {maskPhone(m.phone)} · ID {m.idResult ?? "none"}</span>
          </div>
          <p className="text-sm">
            <span className="text-muted">Intent:</span> {m.intent === null ? "–" : QUESTION_BY_ID.get("intent")!.options[m.intent]}
            {m.dealbreakers.length > 0 && <> · <span className="text-muted">Dealbreakers:</span> {m.dealbreakers.join(", ").replaceAll("_", " ")}</>}
          </p>
          <p className="leading-relaxed whitespace-pre-line">{m.profileBio}</p>
          <audio controls preload="none" src={`/api/voice/${m.id}`} className="w-full" />
          <div className="flex flex-wrap gap-2">
            <form action={reviewMemberAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="memberId" value={m.id} />
              {m.reviewStatus !== "approved" && <SubmitButton name="decision" value="approved">Approve</SubmitButton>}
              {m.reviewStatus !== "waitlisted" && <SubmitButton name="decision" value="waitlisted" className="btn-ghost">Waitlist</SubmitButton>}
              {m.reviewStatus !== "rejected" && <SubmitButton name="decision" value="rejected" className="btn-quiet">Reject</SubmitButton>}
            </form>
            <form action={removeMemberAction}>
              <input type="hidden" name="memberId" value={m.id} />
              <button className="btn-quiet text-alert">Remove from Amora</button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
