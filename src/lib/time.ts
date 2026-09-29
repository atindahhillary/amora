import { DROP_HOUR_LOCAL, DROP_WEEKDAY, TIMEZONE_OFFSET_HOURS } from "./config";

const HOUR = 3_600_000;

// The next weekly drop strictly after `now`, e.g. Thursday 18:00 Nairobi time.
export function nextDropAt(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + TIMEZONE_OFFSET_HOURS * HOUR);
  const candidate = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), DROP_HOUR_LOCAL),
  );
  let days = (DROP_WEEKDAY - local.getUTCDay() + 7) % 7;
  if (days === 0 && candidate.getTime() <= local.getTime()) days = 7;
  candidate.setUTCDate(candidate.getUTCDate() + days);
  return new Date(candidate.getTime() - TIMEZONE_OFFSET_HOURS * HOUR);
}

// The Nairobi calendar month containing `d`, as [start, end) instants. Used for monthly quotas.
export function nairobiMonth(d: Date): { start: Date; end: Date } {
  const local = new Date(d.getTime() + TIMEZONE_OFFSET_HOURS * HOUR);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const shift = TIMEZONE_OFFSET_HOURS * HOUR;
  return {
    start: new Date(Date.UTC(y, m, 1) - shift),
    end: new Date(Date.UTC(y, m + 1, 1) - shift),
  };
}

export function ageOn(birthDate: Date, on: Date = new Date()): number {
  let age = on.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = on.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < birthDate.getUTCDate())) age--;
  return age;
}

const fmt = new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatNairobi(d: Date): string {
  return fmt.format(d);
}
