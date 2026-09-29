import { mockIntegrations } from "@/lib/config";

// Shown on every page while the app runs without real SMS, M-Pesa and ID checks.
// In that mode anyone can sign in as any number, so nobody should enter real details.
export function DemoBanner() {
  if (!mockIntegrations()) return null;
  return (
    <div role="note" className="bg-wine-dark px-4 py-2 text-center text-xs text-white sm:text-sm">
      <strong className="font-semibold text-gold">Demo.</strong> Nothing here is real: no SMS, payments or ID checks are
      made, and anyone can sign in as any number. Use made-up names and numbers, never your own.
    </div>
  );
}
