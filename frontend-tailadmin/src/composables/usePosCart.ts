/**
 * usePosCart — PURE client-side POS cart state (no HTTP). A cart line pairs a
 * PosProduct with its chosen quantity, per-item discount, and selected toppings
 * (MADE_TO_ORDER only). Display totals are computed here for the UI; the server
 * recomputes authoritative totals at checkout.
 *
 * Line total = (unitPrice + Σ topping.extraPrice) × qty − itemDiscount.
 * Grand total = subtotal − orderDiscount (tax is 0 in the MVP, doc 51 §4.3).
 *
 * `toCheckoutPayload` builds the POST /sales/orders body: STOCK lines MUST NOT
 * carry a `toppings` array (doc 51 §3.4 — TOPPING.NOT_ALLOWED), so it is omitted
 * for those lines; MADE_TO_ORDER lines send only `toppingProductId`.
 */

import { computed, ref } from 'vue'
import type {
  CheckoutItemInput,
  CheckoutPayload,
  PosProduct,
  PosToppingOption,
} from '@/services/sales.service'

export interface CartLine {
  lineId: number
  product: PosProduct
  qty: number
  itemDiscount: number
  selectedToppings: PosToppingOption[]
}

export function usePosCart() {
  const lines = ref<CartLine[]>([])
  const orderDiscount = ref<number>(0)
  const customerName = ref<string>('')
  let lineCounter = 0

  const isEmpty = computed<boolean>(() => lines.value.length === 0)

  function lineToppingsPrice(line: CartLine): number {
    return line.selectedToppings.reduce((sum, t) => sum + (t.extraPrice || 0), 0)
  }

  /** Display line total: (unitPrice + Σ topping.extraPrice) × qty − itemDiscount. */
  function lineTotal(line: CartLine): number {
    const unit = line.product.sellingPrice + lineToppingsPrice(line)
    const total = unit * line.qty - (line.itemDiscount || 0)
    return total > 0 ? total : 0
  }

  const subtotal = computed<number>(() =>
    lines.value.reduce((sum, line) => sum + lineTotal(line), 0),
  )

  const grandTotal = computed<number>(() => {
    const total = subtotal.value - (orderDiscount.value || 0)
    return total > 0 ? total : 0
  })

  /**
   * Add a product to the cart. STOCK products never carry toppings. If the same
   * product (same mode + identical topping selection) already exists, bump qty.
   */
  function addItem(product: PosProduct, selectedToppings: PosToppingOption[]): void {
    const toppings =
      product.saleMode === 'MADE_TO_ORDER' ? [...selectedToppings] : []

    const existing = lines.value.find(
      (line) =>
        line.product.productId === product.productId &&
        sameToppings(line.selectedToppings, toppings),
    )
    if (existing) {
      existing.qty += 1
      return
    }

    lineCounter += 1
    lines.value.push({
      lineId: lineCounter,
      product,
      qty: 1,
      itemDiscount: 0,
      selectedToppings: toppings,
    })
  }

  function removeLine(lineId: number): void {
    lines.value = lines.value.filter((line) => line.lineId !== lineId)
  }

  function setQty(lineId: number, qty: number): void {
    const line = lines.value.find((l) => l.lineId === lineId)
    if (!line) {
      return
    }
    line.qty = qty > 0 ? Math.floor(qty) : 1
  }

  function setItemDiscount(lineId: number, value: number): void {
    const line = lines.value.find((l) => l.lineId === lineId)
    if (!line) {
      return
    }
    line.itemDiscount = value >= 0 ? value : 0
  }

  function clear(): void {
    lines.value = []
    orderDiscount.value = 0
    customerName.value = ''
  }

  /** Build the POST /sales/orders body for the given outlet + OPEN shift. */
  function toCheckoutPayload(outletId: string, shiftId: string): CheckoutPayload {
    const items: CheckoutItemInput[] = lines.value.map((line) => {
      const item: CheckoutItemInput = {
        productId: line.product.productId,
        qty: line.qty,
      }
      if (line.itemDiscount > 0) {
        item.itemDiscount = line.itemDiscount
      }
      // STOCK products MUST NOT include a toppings array (doc 51 §3.4).
      if (line.product.saleMode === 'MADE_TO_ORDER' && line.selectedToppings.length > 0) {
        item.toppings = line.selectedToppings.map((t) => ({
          toppingProductId: t.toppingProductId,
        }))
      }
      return item
    })

    const payload: CheckoutPayload = {
      outletId,
      shiftId,
      items,
    }
    const name = customerName.value.trim()
    if (name) {
      payload.customerName = name
    }
    if (orderDiscount.value > 0) {
      payload.orderDiscount = orderDiscount.value
    }
    return payload
  }

  return {
    lines,
    orderDiscount,
    customerName,
    isEmpty,
    subtotal,
    grandTotal,
    lineTotal,
    lineToppingsPrice,
    addItem,
    removeLine,
    setQty,
    setItemDiscount,
    clear,
    toCheckoutPayload,
  }
}

/** Compare two topping selections by their product id set (order-independent). */
function sameToppings(a: PosToppingOption[], b: PosToppingOption[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  const idsA = a.map((t) => t.toppingProductId).sort()
  const idsB = b.map((t) => t.toppingProductId).sort()
  return idsA.every((id, index) => id === idsB[index])
}
