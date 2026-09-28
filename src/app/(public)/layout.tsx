import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <nav className="flex items-center gap-1">
          <Link href="/login" className="btn-quiet">Sign in</Link>
          <Link href="/apply" className="btn-primary">Apply</Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="py-8 text-xs text-muted">
        Amora Season 1 · Nairobi · Ages 25 to 40 · Registered with the ODPC before launch
      </footer>
    </div>
  );
}
