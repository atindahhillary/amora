// Small illustrations for the gift catalogue, drawn in the Amora palette.
export function GiftArt({ category, className = "h-20 w-20" }: { category: string; className?: string }) {
  const rose = (x: number, y: number, s = 1) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0v34" stroke="#3f6b55" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M0 20c-7-2-10-7-9-12 6 0 9 5 9 12z" fill="#3f6b55" opacity="0.85" />
      <path d="M-10-8c0-8 5-13 10-13s10 5 10 13c0 6-4 10-10 10S-10-2-10-8z" fill="#9c1f55" />
      <path d="M-5-10c2-5 8-6 10-1-3 0-6 2-6 6-2-1-4-3-4-5z" fill="#c2407a" />
      <path d="M-2-14c2-2 5-2 6 1" stroke="#6e1238" strokeWidth="1.5" fill="none" />
    </g>
  );
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <circle cx="40" cy="40" r="38" fill="#fde4ec" />
      {category === "flowers" && (
        <>
          {rose(28, 36, 0.9)}
          {rose(52, 34, 0.9)}
          {rose(40, 28)}
          <path d="M24 58l16 10 16-10-6-8H30z" fill="#efe8fb" stroke="#7c5fc9" strokeWidth="1.5" />
        </>
      )}
      {category === "chocolates" && (
        <>
          <path d="M40 66c-1 0-2-.3-2.6-1C28 57 16 49 16 37c0-7 5-12 11-12 5 0 9 3 13 7 4-4 8-7 13-7 6 0 11 5 11 12 0 12-12 20-21.4 28-.6.7-1.6 1-2.6 1z" fill="#6e1238" />
          {[[30, 36], [40, 34], [50, 36], [35, 46], [45, 46]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4.5" fill="#5a2e1c" stroke="#c8963e" strokeWidth="1.2" />
          ))}
        </>
      )}
      {category === "together" && (
        <>
          {rose(30, 30, 0.85)}
          <rect x="38" y="42" width="26" height="18" rx="3" fill="#6e1238" />
          <path d="M38 50h26M51 42v18" stroke="#c8963e" strokeWidth="2" />
          <path d="M51 42c-4-6-10-4-8 0M51 42c4-6 10-4 8 0" stroke="#c8963e" strokeWidth="2" fill="none" />
        </>
      )}
      {category === "card" && (
        <>
          <rect x="16" y="26" width="48" height="32" rx="3" fill="#fff" stroke="#9c1f55" strokeWidth="2" />
          <path d="M16 28l24 17 24-17" stroke="#9c1f55" strokeWidth="2" fill="none" />
          <path d="M40 52c-.5 0-1-.2-1.3-.5-3-2.6-6.7-5.2-6.7-9 0-2.3 1.7-4 3.8-4 1.8 0 3.2 1 4.2 2.3 1-1.3 2.4-2.3 4.2-2.3 2.1 0 3.8 1.7 3.8 4 0 3.8-3.7 6.4-6.7 9-.3.3-.8.5-1.3.5z" fill="#c8963e" />
        </>
      )}
    </svg>
  );
}
