import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireMember } from "@/lib/auth";
import { logoutAction } from "../(public)/actions";

const NAV = [
  { href: "/app", label: "Home" },
  { href: "/app/matches", label: "Matches" },
  { href: "/app/gifts", label: "Gifts" },
  { href: "/app/standing", label: "Standing" },
  { href: "/app/safety", label: "Safety" },
  { href: "/app/account", label: "Account" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMember();
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-4">
        <Logo href="/app" />
        <div className="flex items-center gap-1">
          {me.role === "admin" && <Link href="/admin" className="btn-quiet">Matchmaker</Link>}
          <form action={logoutAction}><button className="btn-quiet">Sign out</button></form>
        </div>
      </header>
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line pb-2 text-sm">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-full px-3 py-1.5 whitespace-nowrap text-muted hover:bg-blush hover:text-ink">
            {n.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 pb-12">{children}</main>
    </div>
  );
}
