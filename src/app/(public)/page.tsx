import Link from "next/link";
import { Kanga } from "@/components/Kanga";
import { Petals } from "@/components/Petals";
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
      <section className="relative -mx-4 grid items-center gap-10 px-4 pt-6 sm:-mx-6 sm:px-6 sm:pt-12 md:grid-cols-[1.15fr_1fr]">
        <Petals />
        <div className="relative">
          <p className="eyebrow">Season 1 · Nairobi · Jacaranda season</p>
          <h1 className="mt-3 text-5xl leading-[1.05] sm:text-6xl">
            Fewer matches.<br />Real people.<br /><em>Real love.</em>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Amora is curated matchmaking for adults who want a committed relationship. No swiping, no browsing,
            no strangers you can&apos;t verify.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/apply" className="btn-primary px-7 py-3 text-base">Apply for Season 1</Link>
            <span className="text-sm text-muted">KES {APPLICATION_FEE_KES} application fee, paid by M-Pesa</span>
          </div>
        </div>
        <Kanga className="relative rotate-1 shadow-xl shadow-wine/20" jina="Mapenzi ni kikohozi, hayafichiki" translation="Love is like a cough: it can’t be hidden.">
          <p className="eyebrow">This Thursday</p>
          <p className="mt-3 font-serif text-2xl leading-snug text-wine-dark italic">
            &ldquo;You both want to be settled within two years, faith is central to you both, and you both talk
            things through right away.&rdquo;
          </p>
          <p className="mt-3 text-sm text-muted">Every match arrives with a note like this. A matchmaker approves each one.</p>
        </Kanga>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {PROMISES.map((p) => (
          <div key={p.title} className="card">
            <h2 className="flex items-center gap-2 text-2xl">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gold" aria-hidden><path fill="currentColor" d="M12 21c-.4 0-.8-.1-1.1-.4C7.5 17.8 3 14.6 3 9.9 3 7 5.2 4.7 8 4.7c1.6 0 3 .8 4 2 1-1.2 2.4-2 4-2 2.8 0 5 2.3 5 5.2 0 4.7-4.5 7.9-7.9 10.7-.3.3-.7.4-1.1.4z" /></svg>
              {p.title}
            </h2>
            <p className="mt-2 text-muted">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="text-3xl">How a season <em>works</em></h2>
        <ol className="mt-5 grid gap-5 sm:grid-cols-3">
          <li><p className="eyebrow">1 · Apply</p><p className="mt-1 text-muted">Verify your phone and ID, answer 25 questions about what you want, and record a 30-second voice intro.</p></li>
          <li><p className="eyebrow">2 · Get approved</p><p className="mt-1 text-muted">We open matching only when there are enough verified people on both sides. We&apos;d rather wait than send you poor matches.</p></li>
          <li><p className="eyebrow">3 · Meet</p><p className="mt-1 text-muted">KES {SEASON_PRICE_KES.toLocaleString()} for {SEASON_DAYS} days. Meet someone and leave early? Get part of it back, or gift a season to a friend.</p></li>
        </ol>
      </section>
    </div>
  );
}
