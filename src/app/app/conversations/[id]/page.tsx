import Link from "next/link";
import { notFound } from "next/navigation";
import { GiftArt } from "@/components/GiftArt";
import { SubmitButton } from "@/components/SubmitButton";
import { requireMember } from "@/lib/auth";
import { CLOSE_TEMPLATES, GUIDED_PROMPTS } from "@/lib/config";
import { sql } from "@/lib/db";
import { conversationFor, conversationStage, otherId } from "@/lib/services/conversations";
import { formatNairobi } from "@/lib/time";
import { checkInAction, confirmDateAction, markListenedAction, reportNoShowAction } from "../../match-actions";
import { AutoRefresh, CloseForm, MessageForm, PlanDateForm, PromptForm } from "./forms";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMember();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await conversationFor(id, me.id);
  if (!c) notFound();
  const theirId = otherId(c, me.id);
  const [them] = await sql<{ firstName: string }[]>`select first_name from members where id = ${theirId}`;
  const stage = await conversationStage(c);
  const live = c.status === "open" || c.status === "date_planned";

  const listens = await sql<{ memberId: string }[]>`select member_id from conversation_listens where conversation_id = ${c.id}`;
  const iListened = listens.some((l) => l.memberId === me.id);
  const prompts = await sql<{ memberId: string; promptIndex: number; body: string }[]>`
    select member_id, prompt_index, body from prompt_answers where conversation_id = ${c.id}`;
  const messages = await sql<{ id: number; senderId: string; body: string; createdAt: Date }[]>`
    select id, sender_id, body, created_at from messages where conversation_id = ${c.id} order by id`;
  const [plan] = await sql<{ startsAt: Date; proposedBy: string; confirmedAt: Date | null; name: string; area: string; notes: string | null }[]>`
    select d.starts_at, d.proposed_by, d.confirmed_at, v.name, v.area, v.notes
    from date_plans d join venues v on v.id = d.venue_id where d.conversation_id = ${c.id}`;
  const venues = await sql<{ id: number; name: string; area: string; kind: string }[]>`
    select id, name, area, kind from venues where active order by name`;
  const [myCheckin] = await sql<{ status: string }[]>`
    select dc.status from date_checkins dc join date_plans d on d.id = dc.date_plan_id
    where d.conversation_id = ${c.id} and dc.member_id = ${me.id}`;
  const daysLeft = Math.max(0, Math.ceil((c.expiresAt.getTime() - Date.now()) / 86_400_000));
  const hidden = <input type="hidden" name="conversationId" value={c.id} />;

  return (
    <div className="space-y-5">
      {live && <AutoRefresh />}
      <Link href="/app/matches" className="btn-quiet px-0">← Matches</Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-4xl">{them.firstName}</h1>
        {c.status === "open" && <span className="pill">{daysLeft} {daysLeft === 1 ? "day" : "days"} left to reply, plan a date or close</span>}
      </div>

      {c.status === "closed" && (
        <div className="notice space-y-2">
          {c.closeKind === "safety" ? (
            c.closedBy === me.id
              ? <p>You ended this conversation and reported it. Our team will review it within 24 hours.</p>
              : <p>This conversation has ended.</p>
          ) : c.closedBy === me.id ? (
            <p>You closed this conversation respectfully. Thank you.</p>
          ) : (
            <><p>{them.firstName} closed this conversation:</p><p className="font-serif text-xl text-wine-dark italic">&ldquo;{c.closeMessage}&rdquo;</p></>
          )}
        </div>
      )}
      {c.status === "expired" && <p className="notice">This conversation&apos;s 7-day window ended.</p>}

      {/* Stage 1: voice intros */}
      <section className="card space-y-3">
        <p className="eyebrow">1 · Voice intros</p>
        <audio controls src={`/api/voice/${theirId}`} className="w-full" preload="none" />
        {live && !iListened && (
          <form action={markListenedAction}>{hidden}<SubmitButton className="btn-ghost">I&apos;ve listened</SubmitButton></form>
        )}
        {iListened && stage === "listen" && <p className="text-sm text-muted">Waiting for {them.firstName} to listen to yours.</p>}
      </section>

      {/* Stage 2: guided prompts */}
      {stage !== "listen" && (
        <section className="card space-y-5">
          <p className="eyebrow">2 · Three questions</p>
          {GUIDED_PROMPTS.map((p, i) => {
            const mine = prompts.find((x) => x.memberId === me.id && x.promptIndex === i);
            const theirs = prompts.find((x) => x.memberId === theirId && x.promptIndex === i);
            return (
              <div key={i} className="space-y-2">
                <p className="font-medium">{p}</p>
                {mine ? (
                  <>
                    <p className="rounded-xl bg-blush/50 p-3 text-sm"><span className="text-muted">You: </span>{mine.body}</p>
                    {theirs
                      ? <p className="rounded-xl border border-line p-3 text-sm"><span className="text-muted">{them.firstName}: </span>{theirs.body}</p>
                      : <p className="text-sm text-muted">{them.firstName} hasn&apos;t answered yet.</p>}
                  </>
                ) : live ? (
                  <>
                    <PromptForm conversationId={c.id} index={i} />
                    {theirs && <p className="text-xs text-muted">{them.firstName} has answered. You&apos;ll see it once you share yours.</p>}
                  </>
                ) : null}
              </div>
            );
          })}
        </section>
      )}

      {/* Stage 3: free chat */}
      {stage === "chat" && (
        <section className="card space-y-4">
          <p className="eyebrow">3 · Conversation</p>
          {messages.length === 0 && <p className="text-sm text-muted">You&apos;ve both answered. Say hello.</p>}
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id} className={`flex ${m.senderId === me.id ? "justify-end" : ""}`}>
                <p className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${m.senderId === me.id ? "bg-linear-to-br from-wine to-wine-dark text-white rounded-br-md" : "bg-lilac text-ink rounded-bl-md"}`}>
                  {m.body}
                </p>
              </li>
            ))}
          </ul>
          {live && <MessageForm conversationId={c.id} />}
        </section>
      )}

      {/* Date bridge */}
      {live && stage === "chat" && (
        <section className="card space-y-3">
          <p className="eyebrow">Plan a date</p>
          {plan?.confirmedAt ? (
            <div className="space-y-3">
              <p><strong>{plan.name}</strong>, {plan.area} · {formatNairobi(plan.startsAt)}</p>
              {plan.notes && <p className="text-sm text-muted">{plan.notes}</p>}
              <p className="text-sm text-muted">
                {me.trustedContactPhone
                  ? "We've told your trusted contact where you'll be."
                  : <>Add a <Link href="/app/safety" className="underline">trusted contact</Link> so someone knows where you are.</>}
              </p>
              {myCheckin ? (
                <p className="notice">{myCheckin.status === "ok" ? "You checked in. Thank you." : "We've alerted your trusted contact and our team."}</p>
              ) : plan.startsAt.getTime() - Date.now() < 3_600_000 ? (
                <form action={checkInAction} className="flex flex-wrap gap-2">
                  {hidden}
                  <SubmitButton name="status" value="ok">I&apos;m okay</SubmitButton>
                  <SubmitButton name="status" value="need_help" className="btn-ghost text-alert">I need help</SubmitButton>
                </form>
              ) : null}
              {plan.startsAt < new Date() && (
                <form action={reportNoShowAction}>{hidden}<button className="btn-quiet px-0 text-xs">{them.firstName} didn&apos;t show up</button></form>
              )}
            </div>
          ) : plan ? (
            plan.proposedBy === me.id ? (
              <>
                <p>You suggested <strong>{plan.name}</strong>, {plan.area} · {formatNairobi(plan.startsAt)}. Waiting for {them.firstName} to confirm.</p>
                <PlanDateForm conversationId={c.id} venues={venues} />
              </>
            ) : (
              <div className="space-y-3">
                <p>{them.firstName} suggested <strong>{plan.name}</strong>, {plan.area} · {formatNairobi(plan.startsAt)}.</p>
                <form action={confirmDateAction}>{hidden}<SubmitButton>Confirm this date</SubmitButton></form>
                <p className="text-sm text-muted">Or suggest something else:</p>
                <PlanDateForm conversationId={c.id} venues={venues} />
              </div>
            )
          ) : (
            <PlanDateForm conversationId={c.id} venues={venues} />
          )}
        </section>
      )}

      {live && stage === "chat" && (
        <Link href={`/app/gifts?to=${c.id}`} className="card flex items-center gap-4 hover:border-wine">
          <GiftArt category="flowers" className="h-14 w-14 shrink-0" />
          <div>
            <p className="font-serif text-xl text-wine-dark">Send {them.firstName} flowers</p>
            <p className="text-sm text-muted">Or chocolates, or a handwritten card. They choose where it&apos;s delivered.</p>
          </div>
        </Link>
      )}

      {live && (
        <section className="card space-y-3">
          <p className="eyebrow">Not the one?</p>
          <CloseForm conversationId={c.id} templates={CLOSE_TEMPLATES} otherName={them.firstName} />
        </section>
      )}
    </div>
  );
}
