const JAKARTA_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

export function toJakartaBusinessDate(date: Date): string {
  return new Date(date.getTime() + JAKARTA_UTC_OFFSET_MS).toISOString().slice(0, 10);
}
