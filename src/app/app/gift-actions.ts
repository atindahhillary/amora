"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { acceptGift, createGift, declineGift } from "@/lib/services/gifts";

export type CreateState = { error?: string; giftId?: string; priceKes?: number; itemName?: string } | undefined;

export async function createGiftAction(_: CreateState, form: FormData): Promise<CreateState> {
  const me = await requireMember();
  const res = await createGift(
    me.id,
    String(form.get("conversationId") ?? ""),
    Number(form.get("itemId")),
    String(form.get("note") ?? "").trim(),
  );
  if ("error" in res) return { error: res.error };
  return { giftId: res.giftId, priceKes: res.priceKes, itemName: String(form.get("itemName") ?? "") };
}

export type RespondState = { error?: string } | undefined;

export async function acceptGiftAction(_: RespondState, form: FormData): Promise<RespondState> {
  const me = await requireMember();
  const area = String(form.get("area") ?? "").trim();
  const details = String(form.get("details") ?? "").trim();
  if (area.length < 2 || details.length < 5) return { error: "Tell us the area and where exactly to deliver." };
  if (details.length > 300) return { error: "Keep delivery details under 300 characters." };
  if (!(await acceptGift(me.id, String(form.get("giftId")), area.slice(0, 60), details))) {
    return { error: "This gift can't be accepted any more." };
  }
  revalidatePath("/app/gifts");
  return undefined;
}

export async function declineGiftAction(form: FormData): Promise<void> {
  const me = await requireMember();
  await declineGift(me.id, String(form.get("giftId")));
  revalidatePath("/app/gifts");
}
