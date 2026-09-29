import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const { removed } = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="card space-y-5">
        <h1 className="text-3xl">Welcome back</h1>
        {removed && <p className="error">This account has been closed. Contact support if you think this is a mistake.</p>}
        <LoginForm />
      </div>
    </div>
  );
}
