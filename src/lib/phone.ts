// Normalises Kenyan mobile numbers to 2547XXXXXXXX / 2541XXXXXXXX, the format M-Pesa expects.
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()+]/g, "");
  let local: string;
  if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  else return null;
  return `254${local}`;
}

export function maskPhone(phone: string): string {
  return `+${phone.slice(0, 3)} ••• ••• ${phone.slice(-3)}`;
}
