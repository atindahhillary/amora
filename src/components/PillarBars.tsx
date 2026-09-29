import { PILLAR_LABELS, type Pillar } from "@/lib/questions";

export function PillarBars({ pillars }: { pillars: Record<string, number> }) {
  return (
    <dl className="space-y-2.5">
      {(Object.keys(PILLAR_LABELS) as Pillar[]).map((p) => (
        <div key={p}>
          <div className="flex justify-between text-sm">
            <dt>{PILLAR_LABELS[p]}</dt>
            <dd className="font-medium tabular-nums">{pillars[p] ?? 0}%</dd>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-blush">
            <div className="h-1.5 rounded-full bg-linear-to-r from-jacaranda to-wine" style={{ width: `${pillars[p] ?? 0}%` }} />
          </div>
        </div>
      ))}
    </dl>
  );
}
