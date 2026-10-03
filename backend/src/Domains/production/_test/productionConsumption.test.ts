import {
  scaledIngredientConsumption,
  ingredientRequirementPerUnit,
} from '../productionConsumption';

describe('productionConsumption (shared backflushing math)', () => {
  describe('scaledIngredientConsumption', () => {
    it('should compute base * scale * (1 + loss/100)', () => {
      // 500 base, scale 2, no loss -> 1000
      expect(scaledIngredientConsumption(500, 0, 2)).toBe(1000);
      // 100 base, scale 1, 25% loss -> 125
      expect(scaledIngredientConsumption(100, 25, 1)).toBe(125);
    });
  });

  describe('ingredientRequirementPerUnit', () => {
    it('should compute base * (1 + loss/100) / yieldQty', () => {
      // 500 base, 0 loss, yield 20 -> 25 per finished unit
      expect(ingredientRequirementPerUnit(500, 0, 20)).toBe(25);
      // 100 base, 25% loss, yield 20 -> 6.25 per finished unit
      expect(ingredientRequirementPerUnit(100, 25, 20)).toBe(6.25);
    });

    it('should be CONSISTENT with scaledIngredientConsumption (preview == execution)', () => {
      // Producing `producibleQty` finished units from `yieldQty`-batch recipe:
      // scaleFactor = producibleQty / yieldQty. Total consumption for that run
      // must equal perUnit * producibleQty — the invariant that makes the
      // producible preview match what instant-complete backflushing executes.
      const baseQty = 320;
      const loss = 7.5;
      const yieldQty = 25;
      const producibleQty = 13;

      const perUnit = ingredientRequirementPerUnit(baseQty, loss, yieldQty);
      const scaleFactor = producibleQty / yieldQty;
      const executed = scaledIngredientConsumption(baseQty, loss, scaleFactor);

      expect(executed).toBeCloseTo(perUnit * producibleQty, 10);
    });
  });
});
