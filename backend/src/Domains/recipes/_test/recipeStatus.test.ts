import { RECIPE_STATUSES, isRecipeStatus, canTransition } from '../recipeStatus';

describe('isRecipeStatus', () => {
  it('should accept valid statuses', () => {
    for (const s of RECIPE_STATUSES) {
      expect(isRecipeStatus(s)).toBe(true);
    }
  });

  it('should reject invalid values', () => {
    expect(isRecipeStatus('PUBLISHED')).toBe(false);
    expect(isRecipeStatus(1)).toBe(false);
    expect(isRecipeStatus(null)).toBe(false);
  });
});

describe('canTransition', () => {
  it('should allow DRAFT -> ACTIVE and DRAFT -> ARCHIVED', () => {
    expect(canTransition('DRAFT', 'ACTIVE')).toBe(true);
    expect(canTransition('DRAFT', 'ARCHIVED')).toBe(true);
  });

  it('should allow ACTIVE -> ARCHIVED only', () => {
    expect(canTransition('ACTIVE', 'ARCHIVED')).toBe(true);
    expect(canTransition('ACTIVE', 'DRAFT')).toBe(false);
  });

  it('should treat ARCHIVED as terminal', () => {
    expect(canTransition('ARCHIVED', 'ACTIVE')).toBe(false);
    expect(canTransition('ARCHIVED', 'DRAFT')).toBe(false);
  });
});
