import { sql } from "@/lib/db";
import { maskPhone } from "@/lib/phone";

export default async function SmsPage() {
  const rows = await sql<{ id: number; toPhone: string; body: string; provider: string; providerStatus: string | null; createdAt: Date }[]>`
    select * from sms_outbox order by id desc limit 100`;
  return (
    <div className="space-y-5">
      <h1 className="text-4xl">SMS log</h1>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>When</th><th>To</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="whitespace-nowrap">{maskPhone(r.toPhone)}</td>
                <td>{r.body}</td>
                <td className="text-muted">{r.provider}/{r.providerStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
