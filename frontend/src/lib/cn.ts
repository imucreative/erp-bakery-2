/**
 * Lightweight class-name joiner. Accepts strings, falsy values, and arrays;
 * filters out falsy entries and joins with a space. Sufficient for the ERP
 * foundation without pulling in extra dependencies.
 */
export type ClassValue = string | false | null | undefined | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) {
      continue;
    }
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) {
        out.push(nested);
      }
    } else {
      out.push(value);
    }
  }
  return out.join(' ');
}
