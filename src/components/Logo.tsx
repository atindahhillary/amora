import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-serif text-xl font-semibold text-wine">
      <svg viewBox="0 0 512 512" className="h-7 w-7" aria-hidden>
        <rect width="512" height="512" rx="112" fill="currentColor" />
        <path d="M256 396c-9 0-17-3-24-9-58-50-128-102-128-176 0-51 38-89 86-89 28 0 51 13 66 34 15-21 38-34 66-34 48 0 86 38 86 89 0 74-70 126-128 176-7 6-15 9-24 9z" fill="none" stroke="#fbf7f4" strokeWidth="28" strokeLinejoin="round" />
      </svg>
      Amora
    </Link>
  );
}
