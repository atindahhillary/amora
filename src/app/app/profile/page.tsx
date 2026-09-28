import { redirect } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const me = await requireMember();
  if (!me.questionnaireDoneAt || !me.voiceDoneAt) redirect("/app");
  return (
    <div className="card space-y-4">
      <p className="eyebrow">Step 5</p>
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <p className="text-muted">
        We drafted this from your answers. Make it sound like you: edit anything, then approve it. Your matches
        see it on their match card, next to the reason we matched you.
      </p>
      <ProfileForm draft={me.profileBio ?? me.profileDraft ?? ""} />
    </div>
  );
}
