import Link from "next/link";
import { APPLICATION_FEE_KES, MATCHES_PER_WEEK, SEASON_DAYS, SEASON_PRICE_KES } from "@/lib/config";

const PROMISES = [
  { title: "Everyone is verified", body: "Phone, selfie and national ID, checked before anyone sees you. One person, one account." },
  { title: `${MATCHES_PER_WEEK} matches, every Thursday`, body: "Chosen by a matchmaker, not a swipe. Each one comes with the reason we think it could work." },
  { title: "Closing is a kindness", body: "Not feeling it? One tap sends a respectful goodbye. Ghosting is the only thing that counts against you." },
  { title: "A safe first date", body: "Vetted venues, a trusted contact who knows where you are, and a check-in on the night." },
];

export default function Landing() {
  return (
    <div className="space-y-16 pb-10">
      <section className="grid items-center gap-10 pt-6 sm:pt-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow">Season 1 · Nairobi</p>
          <h1 className="mt-3 text-4xl leading-tight font-semibold sm:text-5xl">
            Fewer matches. Real people. Serious intentions.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Amora is curated matchmaking for adults who want a committed relationship. No swiping, no browsing,
            no strangers you can&apos;t verify.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/apply" className="btn-primary px-6 py-3 text-base">Apply for Season 1</Link>
            <span className="text-sm text-muted">KES {APPLICATION_FEE_KES} application fee, paid by M-Pesa</span>
          </div>
        </div>
        <div className="card space-y-4 bg-blush/40">
          <p className="eyebrow">This Thursday</p>
          <p className="font-serif text-2xl">&ldquo;You both want to be settled within two years, faith is central to you both, and you both talk things through right away.&rdquo;</p>
          <p className="text-sm text-muted">Every match arrives with a note like this. A matchmaker approves each one.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {PROMISES.map((p) => (
          <div key={p.title} className="card">
            <h2 className="text-xl font-semibold">{p.title}</h2>
            <p className="mt-2 text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-2xl font-semibold">How a season works</h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          <li><p className="eyebrow">1 · Apply</p><p className="mt-1 text-muted">Verify your phone and ID, answer 25 questions about what you want, and record a 30-second voice intro.</p></li>
          <li><p className="eyebrow">2 · Get approved</p><p className="mt-1 text-muted">We open matching only when there are enough verified people on both sides. We&apos;d rather wait than send you poor matches.</p></li>
          <li><p className="eyebrow">3 · Meet</p><p className="mt-1 text-muted">KES {SEASON_PRICE_KES.toLocaleString()} for {SEASON_DAYS} days. Meet someone and leave early? Get part of it back, or gift a season to a friend.</p></li>
        </ol>
      </section>
    </div>
  );
}
