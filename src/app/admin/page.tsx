import Link from "next/link";
import { sql } from "@/lib/db";
import { densityByAge, densityReport, getSetting } from "@/lib/services/matching";
import { formatNairobi, nextDropAt } from "@/lib/time";
import { toggleMatchingAction } from "./actions";

export default async function AdminHome() {
  const d = await densityReport();
  const bands = await densityByAge();
  const open = await getSetting("matching_open", false);
  const minPerSide = await getSetting("min_per_side_to_open", 40);
  const cap = await getSetting("cohort_cap", 400);
  const [counts] = await sql<{ pendingReview: number; proposed: number; openReports: number; help: number; refunds: number; queued: number }[]>`
    select
      (select count(*)::int from members where review_status = 'pending' and profile_approved_at is not null) as pending_review,
      (select count(*)::int from standing_events where status = 'proposed') as proposed,
      (select count(*)::int from reports where status = 'open' and reason <> 'date_help') as open_reports,
      (select count(*)::int from reports where status = 'open' and reason = 'date_help') as help,
      (select count(*)::int from payments where status = 'refund_requested') as refunds,
      (select count(*)::int from matches where drop_at > now()) as queued`;
  const ready = d.active.woman >= minPerSide && d.active.man >= minPerSide;
  const total = d.approved.woman + d.approved.man;

  return (
    <div className="space-y-6">
      {counts.help > 0 && (
        <Link href="/admin/reports" className="error block font-medium">
          {counts.help} member{counts.help > 1 ? "s" : ""} tapped &ldquo;I need help&rdquo; on a date. Call them now.
        </Link>
      )}
      <h1 className="text-4xl">Season 1 overview</h1>

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Density</p>
            <p className="text-sm text-muted">Matching should open only when both sides have at least {minPerSide} active members. Cohort cap: {cap}.</p>
          </div>
          <form action={toggleMatchingAction}>
            <input type="hidden" name="open" value={String(!open)} />
            <button className={open ? "btn-ghost" : "btn-primary"} disabled={!open && !ready}>
              {open ? "Pause matching" : ready ? "Open matching" : "Not enough members yet"}
            </button>
          </form>
        </div>
        <table className="data-table">
          <thead><tr><th /><th>Women</th><th>Men</th><th>Ratio</th></tr></thead>
          <tbody>
            {(["applied", "approved", "active"] as const).map((k) => (
              <tr key={k}>
                <td className="capitalize">{k === "active" ? "In a season" : k}</td>
                <td className="tabular-nums">{d[k].woman}</td>
                <td className="tabular-nums">{d[k].man}</td>
                <td className="tabular-nums">{d[k].man ? (d[k].woman / d[k].man).toFixed(2) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <p className="eyebrow">In a season, by age</p>
          <table className="data-table mt-1">
            <thead><tr><th>Age</th><th>Women</th><th>Men</th><th /></tr></thead>
            <tbody>
              {bands.map((b) => {
                const thin = Math.min(b.woman, b.man) < Math.max(5, Math.ceil(minPerSide / 4));
                return (
                  <tr key={b.label}>
                    <td>{b.label}</td>
                    <td className="tabular-nums">{b.woman}</td>
                    <td className="tabular-nums">{b.man}</td>
                    <td className={thin ? "text-alert" : "text-sage"}>{thin ? "Too thin: recruit here" : "OK"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {total >= cap && <p className="notice">You&apos;ve reached the cohort cap. Waitlist new applicants.</p>}
        <p className="text-sm">Matching is <strong>{open ? "open" : "closed"}</strong>. Next drop: {formatNairobi(nextDropAt())} · {counts.queued} matches queued.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <Stat href="/admin/members" n={counts.pendingReview} label="applications to review" />
        <Stat href="/admin/standing" n={counts.proposed} label="penalties to review" />
        <Stat href="/admin/reports" n={counts.openReports} label="open reports" />
        <Stat href="/admin/payments" n={counts.refunds} label="refunds to send" />
      </section>
    </div>
  );
}

function Stat({ href, n, label }: { href: string; n: number; label: string }) {
  return (
    <Link href={href} className="card block hover:border-wine">
      <p className="text-3xl font-semibold tabular-nums">{n}</p>
      <p className="text-sm text-muted">{label}</p>
    </Link>
  );
}
