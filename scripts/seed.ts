// Seeds partner venues and, with --demo, a small verified cohort so matching can be tried locally.
import postgres from "postgres";
import { QUESTIONS } from "../src/lib/questions";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, onnotice: () => {} });

const VENUES = [
  ["Java House", "Westlands", "Café", "Busy and bright. Good for a first coffee."],
  ["Artcaffé", "Yaya Centre", "Café", null],
  ["About Thyme", "Westlands", "Restaurant", "Quiet garden seating."],
  ["Nairobi Arboretum", "Kilimani", "Park walk", "Daytime only. Meet at the main gate."],
  ["Kazuri Coffee Lounge", "Kilimani", "Café", null],
  ["Talisman", "Karen", "Restaurant", "Book ahead on weekends."],
] as const;

const [{ n }] = await sql`select count(*)::int as n from venues`;
if (n === 0) {
  for (const [name, area, kind, notes] of VENUES) {
    await sql`insert into venues (name, area, kind, notes) values (${name}, ${area}, ${kind}, ${notes})`;
  }
  console.log(`seeded ${VENUES.length} venues`);
}

if (process.argv.includes("--demo")) {
  const women = ["Achieng", "Wanjiru", "Amina", "Njeri", "Chebet", "Mumbua"];
  const men = ["Otieno", "Kamau", "Baraka", "Kiprop", "Mwangi", "Juma"];
  let i = 0;
  for (const [gender, seeking, names] of [["woman", "man", women], ["man", "woman", men]] as const) {
    for (const name of names) {
      i++;
      const phone = `2547990000${String(i).padStart(2, "0")}`;
      const year = 1988 + (i % 10);
      const [m] = await sql<{ id: string }[]>`
        insert into members (phone, first_name, birth_date, gender, seeking, pref_age_min, pref_age_max, consented_at,
          phone_verified_at, fee_paid_at, id_verified_at, questionnaire_done_at, voice_done_at, profile_bio,
          profile_approved_at, review_status, reviewed_at)
        values (${phone}, ${name}, ${`${year}-06-15`}, ${gender}, ${seeking}, 25, 40, now(), now(), now(), now(), now(), now(),
          ${`I'm ${name}. I'm looking for something real this season, with someone who is kind, curious and ready to build.`},
          now(), 'approved', now())
        on conflict (phone) do nothing returning id`;
      if (!m) continue;
      for (const q of QUESTIONS) {
        // Deterministic spread of answers, avoiding "No" on partner children so the demo cohort pairs up.
        const v = q.id === "partner_children" ? 0 : (i * 7 + q.id.length) % q.options.length;
        await sql`insert into answers (member_id, question_id, value) values (${m.id}, ${q.id}, ${v})`;
      }
      // Tiny silent WAV so voice intro playback works in the demo.
      const wav = Buffer.alloc(44 + 8000, 128);
      wav.write("RIFF", 0); wav.writeUInt32LE(36 + 8000, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
      wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28);
      wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write("data", 36); wav.writeUInt32LE(8000, 40);
      await sql`insert into voice_intros (member_id, mime, audio) values (${m.id}, 'audio/wav', ${wav})`;
      await sql`insert into seasons (member_id, starts_at, ends_at) values (${m.id}, now(), now() + interval '90 days')`;
    }
  }
  console.log("seeded demo cohort (phones 254799000001 to 254799000012)");
}
await sql.end();
