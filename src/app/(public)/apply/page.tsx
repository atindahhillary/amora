import { ApplyForm } from "./ApplyForm";

export default function ApplyPage() {
  return (
    <div className="mx-auto max-w-2xl py-6">
      <p className="eyebrow">Apply for Season 1</p>
      <h1 className="mt-2 text-4xl">Tell us who you are</h1>
      <p className="mt-2 mb-6 text-muted">
        This takes about 15 minutes in total. You&apos;ll verify your phone now, then pay the application fee,
        verify your ID and answer the questionnaire.
      </p>
      <ApplyForm />
    </div>
  );
}
