import { createHmac } from "node:crypto";
import { mockIntegrations } from "../config";

// Identity verification (selfie liveness + Kenyan national ID) via Smile ID.
//
// Only the outcome is kept. Images go straight from the member's browser to Smile ID
// and are never stored by Amora. The ID number is kept only as an HMAC so one
// ID can't open two accounts.
//
// The live Smile ID integration is NOT built yet: it needs a partner account, and
// their web capture component and job callback have to be wired against their
// current docs (https://docs.usesmileid.com). Until then only mock mode works.

export interface IdentityResult {
  provider: string;
  jobId: string;
  result: "passed" | "failed" | "pending";
  idNumberHash: string | null;
}

export function hashIdNumber(idNumber: string): string {
  const pepper = process.env.ID_HASH_PEPPER;
  if (!pepper) throw new Error("ID_HASH_PEPPER is not set");
  return createHmac("sha256", pepper).update(idNumber.replace(/\s/g, "").toUpperCase()).digest("hex");
}

export function isValidKenyanIdNumber(idNumber: string): boolean {
  return /^\d{7,8}$/.test(idNumber.replace(/\s/g, ""));
}

export async function verifyIdentity(opts: { memberId: string; idNumber: string }): Promise<IdentityResult> {
  if (!mockIntegrations()) {
    throw new Error("Smile ID is not configured yet. Set AMORA_MOCK_INTEGRATIONS=1 to use the mock.");
  }
  return {
    provider: "mock",
    jobId: `mock_${opts.memberId}`,
    result: "passed",
    idNumberHash: hashIdNumber(opts.idNumber),
  };
}
