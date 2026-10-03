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
 * IMPORTANT — lossPercentage does NOT reduce stock.
 * The recipe item `lossPercentage` is kept purely as planning ESTIMATE/guidance
 * (stored and surfaced on the recipe for analysis) and is intentionally NOT part
 * of the stock-consumption math. Real consumption maximises the number of
 * finished units obtainable from available stock, so:
 *
 *   scaleFactor      = scheduledQty / recipe.yieldQty
 *   consumedQty      = baseQty * scaleFactor
 *
 * Where `baseQty` is the recipe item quantity defined per one full recipe batch
 * (which yields `yieldQty` finished units).
 */

/**
 * Quantity of an ingredient consumed when producing with the given scale factor.
 * This is the exact expression used by instant-complete backflushing.
 *
 * Loss percentage is deliberately NOT a factor here: it is an estimate only and
 * must never shrink the amount of stock a production run can consume.
 *
 * @param baseQty      recipe item qty per one full recipe batch
 * @param scaleFactor  scheduledQty / recipe.yieldQty
 */
export function scaledIngredientConsumption(
  baseQty: number,
  scaleFactor: number,
): number {
  return baseQty * scaleFactor;
}

/**
 * Quantity of an ingredient required to produce exactly ONE finished unit.
 * Equivalent to scaledIngredientConsumption(baseQty, 1 / yieldQty):
 *
 *   requiredPerUnit = baseQty / yieldQty
 *
 * Used by the producible-quantity preview. Keeping it defined in terms of the
 * same expression guarantees preview math matches execution math. Loss
 * percentage is excluded on purpose (estimate only — never reduces stock).
 *
 * @param baseQty   recipe item qty per one full recipe batch
 * @param yieldQty  finished units produced by one full recipe batch (> 0)
 */
export function ingredientRequirementPerUnit(
  baseQty: number,
  yieldQty: number,
): number {
  return scaledIngredientConsumption(baseQty, 1 / yieldQty);
}
