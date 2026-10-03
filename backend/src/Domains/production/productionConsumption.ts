/**
 * Production consumption math — the SINGLE SOURCE OF TRUTH for how a recipe
 * ingredient line translates into a consumed quantity.
 *
 * Both the instant-complete backflushing path (CreateProductionOrder ->
 * ProductionOrderRepository.createInstant) and the read-only producible-quantity
 * preview (GET /production/producible) MUST compute ingredient consumption from
 * these helpers so the previewed numbers equal the numbers actually executed on
 * submit. Do NOT duplicate this formula anywhere else.
 *
 * Formula (production-domain §6):
 *   scaleFactor      = scheduledQty / recipe.yieldQty
 *   consumedQty      = baseQty * scaleFactor * (1 + lossPercentage / 100)
 *
 * Where `baseQty` is the recipe item quantity defined per one full recipe batch
 * (which yields `yieldQty` finished units) and `lossPercentage` is the expected
 * process loss for that ingredient.
 */

/**
 * Quantity of an ingredient consumed when producing with the given scale factor.
 * This is the exact expression used by instant-complete backflushing.
 *
 * @param baseQty         recipe item qty per one full recipe batch
 * @param lossPercentage  expected loss percentage (e.g. 5 for 5%)
 * @param scaleFactor     scheduledQty / recipe.yieldQty
 */
export function scaledIngredientConsumption(
  baseQty: number,
  lossPercentage: number,
  scaleFactor: number,
): number {
  return baseQty * scaleFactor * (1 + lossPercentage / 100);
}

/**
 * Quantity of an ingredient required to produce exactly ONE finished unit.
 * Equivalent to scaledIngredientConsumption(baseQty, loss, 1 / yieldQty):
 *
 *   requiredPerUnit = baseQty * (1 + loss/100) / yieldQty
 *
 * Used by the producible-quantity preview. Keeping it defined in terms of the
 * same expression guarantees preview math matches execution math.
 *
 * @param baseQty         recipe item qty per one full recipe batch
 * @param lossPercentage  expected loss percentage (e.g. 5 for 5%)
 * @param yieldQty        finished units produced by one full recipe batch (> 0)
 */
export function ingredientRequirementPerUnit(
  baseQty: number,
  lossPercentage: number,
  yieldQty: number,
): number {
  return scaledIngredientConsumption(baseQty, lossPercentage, 1 / yieldQty);
}
