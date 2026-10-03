import {
  scaledIngredientConsumption,
  ingredientRequirementPerUnit,
} from '../productionConsumption';

describe('productionConsumption (shared backflushing math)', () => {
  describe('scaledIngredientConsumption', () => {
    it('should compute base * scale (loss% does NOT reduce stock)', () => {
      // 500 base, scale 2 -> 1000
      expect(scaledIngredientConsumption(500, 2)).toBe(1000);
      // 100 base, scale 1 -> 100 (no loss applied)
      expect(scaledIngredientConsumption(100, 1)).toBe(100);
    });
  });

  describe('ingredientRequirementPerUnit', () => {
    it('should compute base / yieldQty (loss% does NOT reduce stock)', () => {
      // 500 base, yield 20 -> 25 per finished unit
      expect(ingredientRequirementPerUnit(500, 20)).toBe(25);
      // 100 base, yield 20 -> 5 per finished unit
      expect(ingredientRequirementPerUnit(100, 20)).toBe(5);
    });

    it('should be CONSISTENT with scaledIngredientConsumption (preview == execution)', () => {
      // Producing `producibleQty` finished units from `yieldQty`-batch recipe:
      // scaleFactor = producibleQty / yieldQty. Total consumption for that run
      // must equal perUnit * producibleQty — the invariant that makes the
      // producible preview match what instant-complete backflushing executes.
      const baseQty = 320;
      const yieldQty = 25;
      const producibleQty = 13;

      const perUnit = ingredientRequirementPerUnit(baseQty, yieldQty);
      const scaleFactor = producibleQty / yieldQty;
      const executed = scaledIngredientConsumption(baseQty, scaleFactor);

      expect(executed).toBeCloseTo(perUnit * producibleQty, 10);
    });

    it('maximises producible units: stock 1.8, base/unit 0.2 -> 9 (not 8)', () => {
      // base 0.2 per finished unit (e.g. base 0.2, yield 1), stock 1.8.
      // Without loss: floor(1.8 / 0.2) = 9. With old 12.5% loss it was 8.
      const perUnit = ingredientRequirementPerUnit(0.2, 1);
      expect(Math.floor(1.8 / perUnit)).toBe(9);
    });
  });
});
