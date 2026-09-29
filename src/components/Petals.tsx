// Jacaranda petals drifting down behind the hero. Purely decorative, and
// hidden entirely for visitors who prefer reduced motion.
const PETALS = [
  { left: "6%", size: 18, delay: 0, duration: 16, tilt: -30 },
  { left: "22%", size: 13, delay: 5, duration: 19, tilt: 40 },
  { left: "41%", size: 16, delay: 9, duration: 17, tilt: -60 },
  { left: "63%", size: 12, delay: 2, duration: 21, tilt: 20 },
  { left: "78%", size: 20, delay: 7, duration: 15, tilt: -15 },
  { left: "92%", size: 14, delay: 12, duration: 20, tilt: 55 },
];

export function Petals() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="petal absolute top-0 block opacity-0"
          style={{ left: p.left, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }}
        >
          <svg viewBox="0 0 24 24" width={p.size} height={p.size} style={{ transform: `rotate(${p.tilt}deg)` }}>
            {/* A jacaranda bloom: a soft trumpet with a lighter throat. */}
            <path d="M12 2c4 2 7 6 7 11 0 5-3 9-7 9s-7-4-7-9c0-5 3-9 7-11z" fill={i % 2 ? "#9d86dc" : "#7c5fc9"} opacity="0.8" />
            <path d="M12 7c1.6 1.4 2.5 3.4 2.5 6S13.4 18 12 19c-1.4-1-2.5-3.4-2.5-6s.9-4.6 2.5-6z" fill="#efe8fb" opacity="0.7" />
          </svg>
        </span>
      ))}
    </div>
  );
}
