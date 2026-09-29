import { MATCHES_PER_MONTH, REPLACE_PASSED_MATCHES } from "../config";
import { sql } from "../db";
import { pairKey, rankPairs, type Candidate } from "../matching";
import type { Answers } from "../questions";
import { ageOn, nairobiMonth } from "../time";

// Members who can be matched this week: approved, active, in an active season.
export async function loadCandidates(): Promise<Candidate[]> {
  const rows = await sql<{
    id: string; gender: "woman" | "man"; seeking: "woman" | "man"; birthDate: Date;
    prefAgeMin: number; prefAgeMax: number; dealbreakers: string[]; answersJson: string | null;
  }[]>`
    select m.id, m.gender, m.seeking, m.birth_date, m.pref_age_min, m.pref_age_max, m.dealbreakers,
      -- As text: the driver's camelCase transform would otherwise rewrite keys inside JSON (children_want -> childrenWant).
      (select jsonb_object_agg(a.question_id, a.value)::text from answers a where a.member_id = m.id) as answers_json
    from members m
    where m.review_status = 'approved' and m.account_status = 'active' and m.profile_approved_at is not null
      and exists (select 1 from seasons s where s.member_id = m.id and s.exited_at is null
                  and s.starts_at <= now() and s.ends_at > now())`;
  return rows.map((r) => ({
    id: r.id,
    gender: r.gender,
    seeking: r.seeking,
    age: ageOn(r.birthDate),
    prefAgeMin: r.prefAgeMin,
    prefAgeMax: r.prefAgeMax,
    dealbreakers: r.dealbreakers,
    answers: r.answersJson ? (JSON.parse(r.answersJson) as Answers) : {},
  }));
}

// Pairs that must never be proposed: already matched once, or either person blocked the other.
export async function loadSkips(): Promise<Set<string>> {
  const rows = await sql<{ x: string; y: string }[]>`
    select member_a as x, member_b as y from matches
    union all select blocker_id, blocked_id from blocks`;
  return new Set(rows.map((r) => pairKey(r.x, r.y)));
}

// Matches left for each member in the month of `dropAt`. With REPLACE_PASSED_MATCHES,
// a match the other person passed on is handed back.
export async function remainingQuota(dropAt: Date, ids: string[]): Promise<Map<string, number>> {
  const { start, end } = nairobiMonth(dropAt);
  const rows = await sql<{ id: string; used: number }[]>`
    select id, count(*)::int as used from (
      select member_a as id, b_response as theirs from matches where drop_at >= ${start} and drop_at < ${end}
      union all
      select member_b, a_response from matches where drop_at >= ${start} and drop_at < ${end}
    ) t
    where not (${REPLACE_PASSED_MATCHES} and theirs is not distinct from 'pass')
    group by id`;
  const used = new Map(rows.map((r) => [r.id, r.used]));
  return new Map(ids.map((id) => [id, MATCHES_PER_MONTH - (used.get(id) ?? 0)]));
}

export async function rankedForDrop(dropAt: Date) {
  const candidates = await loadCandidates();
  const ranked = rankPairs(candidates, await loadSkips());
  const quota = await remainingQuota(dropAt, candidates.map((c) => c.id));
  return { candidates, ranked, quota };
}

export async function densityReport() {
  const rows = await sql<{ gender: string; review: string; seasonal: boolean; n: number }[]>`
    select m.gender, m.review_status as review,
      exists (select 1 from seasons s where s.member_id = m.id and s.exited_at is null
              and s.starts_at <= now() and s.ends_at > now()) as seasonal,
      count(*)::int as n
    from members m where m.account_status = 'active' group by 1, 2, 3`;
  const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).reduce((s, r) => s + r.n, 0);
  return {
    applied: { woman: count((r) => r.gender === "woman"), man: count((r) => r.gender === "man") },
    approved: {
      woman: count((r) => r.gender === "woman" && r.review === "approved"),
      man: count((r) => r.gender === "man" && r.review === "approved"),
    },
    active: {
      woman: count((r) => r.gender === "woman" && r.review === "approved" && r.seasonal),
      man: count((r) => r.gender === "man" && r.review === "approved" && r.seasonal),
    },
  };
}

export const AGE_BANDS = [
  { label: "25–34", min: 25, max: 34 },
  { label: "35–44", min: 35, max: 44 },
  { label: "45–55", min: 45, max: 55 },
] as const;

// Active members by age band and gender. A band that's thin on one side will leave
// people in it without matches, whatever the overall ratio says.
export async function densityByAge() {
  const rows = await sql<{ gender: string; age: number }[]>`
    select m.gender, date_part('year', age(m.birth_date))::int as age from members m
    where m.account_status = 'active' and m.review_status = 'approved'
      and exists (select 1 from seasons s where s.member_id = m.id and s.exited_at is null
                  and s.starts_at <= now() and s.ends_at > now())`;
  return AGE_BANDS.map((b) => {
    const inBand = rows.filter((r) => r.age >= b.min && r.age <= b.max);
    return {
      label: b.label,
      woman: inBand.filter((r) => r.gender === "woman").length,
      man: inBand.filter((r) => r.gender === "man").length,
    };
  });
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await sql<{ value: T }[]>`select value from settings where key = ${key}`;
  return row ? row.value : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await sql`insert into settings (key, value) values (${key}, ${sql.json(value as never)})
    on conflict (key) do update set value = excluded.value`;
}
