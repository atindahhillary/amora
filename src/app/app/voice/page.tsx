import { redirect } from "next/navigation";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { VoiceRecorder } from "./VoiceRecorder";

export default async function VoicePage() {
  const me = await requireMember();
  if (!me.questionnaireDoneAt) redirect("/app");
  return (
    <div className="card space-y-4">
      <p className="eyebrow">Step 4</p>
      <h1 className="text-3xl">Your 30-second voice intro</h1>
      <p className="text-muted">
        Your matches hear this before anything else, so let them hear you. Try: what a good week looks like
        for you, and what you&apos;re hoping to find this season.
      </p>
      <VoiceRecorder existingUrl={me.voiceDoneAt ? `/api/voice/${me.id}` : null} next="/app/profile" />
      {me.voiceDoneAt && <Link href="/app/profile" className="btn-quiet px-0">Keep my current intro →</Link>}
    </div>
  );
}
