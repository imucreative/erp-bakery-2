/**
 * Recipe (BOM) lifecycle (production-domain §3):
 *   DRAFT -> ACTIVE -> ARCHIVED
 *   DRAFT -> ARCHIVED (abandon a draft)
 *   ACTIVE -> DRAFT is NOT allowed; archive then create a new version.
 * Only one ACTIVE recipe per product (enforced in repository + DB index).
 */
export const RECIPE_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;

export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export function isRecipeStatus(value: unknown): value is RecipeStatus {
  return typeof value === 'string' && (RECIPE_STATUSES as readonly string[]).includes(value);
}

const ALLOWED_TRANSITIONS: Record<RecipeStatus, RecipeStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ARCHIVED'],
  ARCHIVED: [],
};

export function canTransition(from: RecipeStatus, to: RecipeStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}
