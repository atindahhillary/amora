import Link from "next/link";
import { Logo } from "@/components/Logo";
import { requireAdmin } from "@/lib/auth";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/members", "Applications"],
  ["/admin/matching", "Matching"],
  ["/admin/standing", "Penalty review"],
  ["/admin/reports", "Reports"],
  ["/admin/gifts", "Gifts"],
  ["/admin/venues", "Venues"],
  ["/admin/payments", "Refunds"],
  ["/admin/sms", "SMS log"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3"><Logo href="/admin" /><span className="pill">Matchmaker</span></div>
        <Link href="/app" className="btn-quiet">Member view</Link>
      </header>
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line pb-2 text-sm">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-full px-3 py-1.5 whitespace-nowrap text-muted hover:bg-blush hover:text-ink">{label}</Link>
        ))}
      </nav>
      <main className="pb-12">{children}</main>
    </div>
  );
}
