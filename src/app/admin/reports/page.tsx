import { SubmitButton } from "@/components/SubmitButton";
import { sql } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { removeMemberAction, resolveReportAction } from "../actions";

export default async function ReportsPage() {
  const rows = await sql<{ id: number; reason: string; details: string | null; createdAt: Date; reporter: string; reporterPhone: string; reported: string; reportedId: string; conversationId: string | null }[]>`
    select r.id, r.reason, r.details, r.created_at, a.first_name as reporter, a.phone as reporter_phone,
      b.first_name as reported, b.id as reported_id, r.conversation_id
    from reports r join members a on a.id = r.reporter_id join members b on b.id = r.reported_id
    where r.status = 'open' order by (r.reason = 'date_help') desc, r.created_at`;
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-semibold">Reports</h1>
      {rows.length === 0 && <p className="notice">No open reports.</p>}
      {rows.map((r) => (
        <div key={r.id} className={`card space-y-3 ${r.reason === "date_help" ? "border-alert" : ""}`}>
          <p className="font-medium">
            {r.reason === "date_help"
              ? <>🚨 {r.reporter} asked for help on a date. Call {maskPhone(r.reporterPhone)} now.</>
              : <>{r.reporter} reported {r.reported}: {r.reason}</>}
          </p>
          {r.details && <p className="text-sm text-muted">{r.details}</p>}
          <div className="flex flex-wrap gap-2">
            <form action={resolveReportAction} className="flex gap-2">
              <input type="hidden" name="reportId" value={r.id} />
              <SubmitButton name="decision" value="upheld" className="btn-ghost">{r.reason === "date_help" ? "Resolved" : "Uphold"}</SubmitButton>
              <SubmitButton name="decision" value="dismissed" className="btn-quiet">Dismiss</SubmitButton>
            </form>
            {r.reason !== "date_help" && (
              <form action={removeMemberAction}>
                <input type="hidden" name="memberId" value={r.reportedId} />
                <button className="btn-quiet text-alert">Remove {r.reported}</button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
