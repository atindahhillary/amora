import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatNairobi, nextDropAt } from "@/lib/time";

interface Row {
  id: string;
  firstName: string;
  score: number;
  dropAt: Date;
  mine: string | null;
  theirs: string | null;
  conversationId: string | null;
  conversationStatus: string | null;
}

export default async function MatchesPage() {
  const me = await requireMember();
  const rows = await sql<Row[]>`
    select m.id, o.first_name, m.score, m.drop_at,
      case when m.member_a = ${me.id} then m.a_response else m.b_response end as mine,
      case when m.member_a = ${me.id} then m.b_response else m.a_response end as theirs,
      c.id as conversation_id, c.status as conversation_status
    from matches m
    join members o on o.id = case when m.member_a = ${me.id} then m.member_b else m.member_a end
    left join conversations c on c.match_id = m.id
    where (m.member_a = ${me.id} or m.member_b = ${me.id}) and m.drop_at <= now()
    order by m.drop_at desc, m.score desc`;

  const waiting = rows.filter((r) => !r.conversationId && (r.mine === null || r.mine === "save"));
  const talking = rows.filter((r) => r.conversationStatus === "open" || r.conversationStatus === "date_planned");
  const pending = rows.filter((r) => !r.conversationId && r.mine === "accept" && r.theirs !== "pass");
  const past = rows.filter((r) => !waiting.includes(r) && !talking.includes(r) && !pending.includes(r));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Your matches</h1>
        <p className="mt-1 text-muted">New matches arrive {formatNairobi(nextDropAt())}.</p>
      </div>
      <Section title="New this week" empty="No new matches right now. We only send matches we believe in.">
        {waiting.map((r) => (
          <Item key={r.id} href={`/app/matches/${r.id}`} name={r.firstName} note={r.mine === "save" ? "Saved" : `${r.score}% aligned`} highlight />
        ))}
      </Section>
      {talking.length > 0 && (
        <Section title="Conversations">
          {talking.map((r) => (
            <Item key={r.id} href={`/app/conversations/${r.conversationId}`} name={r.firstName}
              note={r.conversationStatus === "date_planned" ? "Date planned" : "Open"} />
          ))}
        </Section>
      )}
      {pending.length > 0 && (
        <Section title="Waiting on them">
          {pending.map((r) => <Item key={r.id} href={`/app/matches/${r.id}`} name={r.firstName} note="You accepted" />)}
        </Section>
      )}
      {past.length > 0 && (
        <Section title="Past">
          {past.map((r) => (
            <Item key={r.id} href={r.conversationId ? `/app/conversations/${r.conversationId}` : `/app/matches/${r.id}`}
              name={r.firstName} note={r.conversationStatus ?? (r.mine === "pass" || r.theirs === "pass" ? "Not this time" : "")} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode[] | React.ReactNode }) {
  const list = Array.isArray(children) ? children : [children];
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {list.length === 0 ? <p className="notice">{empty}</p> : <ul className="space-y-2">{list}</ul>}
    </section>
  );
}

function Item({ href, name, note, highlight }: { href: string; name: string; note: string; highlight?: boolean }) {
  return (
    <li>
      <Link href={href} className={`card flex items-center justify-between py-4 hover:border-wine ${highlight ? "border-wine/40" : ""}`}>
        <span className="font-serif text-lg">{name}</span>
        <span className="pill">{note.replace("_", " ")}</span>
      </Link>
    </li>
  );
}
