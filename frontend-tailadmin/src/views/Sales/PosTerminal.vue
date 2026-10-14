<script setup lang="ts">
/**
 * PosTerminal — the Point-of-Sale screen (doc 51 §11). It resolves the cashier's
 * accessible outlets, finds the OPEN shift for the chosen outlet, and either
 * blocks the terminal with a "Buka Shift" CTA or shows the three-area layout:
 * ProductGrid (left), ModifierPanel (center, MADE_TO_ORDER + hasToppings only),
 * CartPanel (right). The modifier panel is backed by the GLOBAL topping catalog
 * (GET /sales/pos/toppings, loaded once on bootstrap) — not per-product
 * toppings (doc 51 Fase 6b). Payment uses a TWO-STEP checkout→pay flow:
 *
 *   1. POST /sales/orders (checkout) → PENDING_PAYMENT order; use the server
 *      `grandTotal` as the authoritative total shown in the drawer.
 *   2. POST /sales/orders/:id/pay with a single payment of exactly that
 *      grandTotal (guarantees Σ amount == grandTotal).
 *
 * If checkout already created the order and the pay step fails, the created
 * order id is kept so a retry pays the SAME order (no double checkout). On PAID
 * the ReceiptDialog shows the invoice/items/totals/payment + CASH change.
 *
 * A rejected checkout NEVER clears the cart — the failure is surfaced through
 * the existing `payError` → `PaymentDrawer` alert and the basket stays intact so
 * the cashier can adjust the qty, drop the offending line, or retry. Stock
 * rejections are given an explicit instruction for the cashier (POS never
 * backflushes: the only way to get stock is a Production Order); see
 * `toCheckoutErrorMessage`.
 *
 * All cart state lives in `usePosCart`; this view owns the terminal flow,
 * mutation submitting flags, and surfaces backend errors via `toMessage`.
 */
import { computed, onMounted, ref } from 'vue'
import { DoorOpen, X } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import {
  ProductGrid,
  ModifierPanel,
  CartPanel,
  PaymentDrawer,
  ReceiptDialog,
  ShiftBar,
  OpenShiftModal,
  CloseShiftModal,
} from '@/components/sales/pos'
import { usePosCart } from '@/composables/usePosCart'
import { useShifts } from '@/composables/useShifts'
import { usePermission } from '@/composables/usePermission'
import { useAuthStore } from '@/stores/auth'
import { ApiClientError } from '@/services/http'
import { outletService, type Outlet } from '@/services/outlet.service'
import { userService } from '@/services/user.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import {
  salesService,
  type PosProduct,
  type PosToppingOption,
  type Shift,
  type SalesOrder,
  type SalesPaymentInput,
} from '@/services/sales.service'

const pageTitle = 'Point of Sale'
const auth = useAuthStore()
const { findOpenShift, toMessage } = useShifts()
const { can } = usePermission()
const cart = usePosCart()

// ── Outlet + shift context ────────────────────────────────────────────
const outlets = ref<Outlet[]>([])
const selectedOutletId = ref<string>('')
const activeShift = ref<Shift | null>(null)
const bootstrapping = ref<boolean>(true)
const bootstrapError = ref<string | null>(null)

const cashierNames = ref<Map<string, string>>(new Map())

const selectedOutletName = computed<string>(() => {
  const match = outlets.value.find((o) => o.id === selectedOutletId.value)
  return match?.name ?? '—'
})

function cashierName(id: string): string {
  return cashierNames.value.get(id) ?? auth.userEmail ?? id
}

async function bootstrap(): Promise<void> {
  bootstrapping.value = true
  bootstrapError.value = null
  try {
    const [accessible, allUsers] = await Promise.all([
      outletService.getAccessible(),
      fetchAllPaginated((p) => userService.list({ page: p, limit: PAGE_LIMIT })).catch(() => []),
    ])
    outlets.value = accessible
    cashierNames.value = new Map(allUsers.map((u) => [u.id, u.name]))
    if (!selectedOutletId.value && accessible.length > 0) {
      selectedOutletId.value = accessible[0].id
    }
    await resolveShift()
  } catch (error) {
    bootstrapError.value = toMessage(error)
  } finally {
    bootstrapping.value = false
  }
}

async function resolveShift(): Promise<void> {
  if (!selectedOutletId.value) {
    activeShift.value = null
    return
  }
  activeShift.value = await findOpenShift(selectedOutletId.value, auth.user?.id ?? '')
  if (activeShift.value) {
    await loadProducts()
  } else {
    products.value = []
  }
}

async function onOutletChange(outletId: string): Promise<void> {
  selectedOutletId.value = outletId
  cart.clear()
  selectedProduct.value = null
  blockedAlert.value = null
  bootstrapError.value = null
  try {
    await resolveShift()
  } catch (error) {
    bootstrapError.value = toMessage(error)
  }
}

// ── Products ──────────────────────────────────────────────────────────
const products = ref<PosProduct[]>([])
const productsLoading = ref<boolean>(false)
const productsError = ref<string | null>(null)
const productSearch = ref<string>('')
// Dismissible alert raised when the cashier clicks an unsellable card (declared
// here so the earlier outlet-change handler can reset it).
const blockedAlert = ref<string | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined

// GLOBAL topping catalog (active-only) — the single source for the modifier
// panel (doc 51 Fase 6b). Loaded per OUTLET so each topping carries the correct
// per-outlet stock (`availableQty`/`expiredQty`); reloaded whenever the active
// outlet changes so a sold-out/expired topping is flagged against the right
// outlet's inventory.
const posToppings = ref<PosToppingOption[]>([])

async function loadPosToppings(): Promise<void> {
  if (!selectedOutletId.value) {
    posToppings.value = []
    return
  }
  try {
    posToppings.value = await salesService.pos.toppings(selectedOutletId.value)
  } catch {
    // Non-fatal: the modifier panel renders an empty-toppings state.
    posToppings.value = []
  }
}

async function loadProducts(): Promise<void> {
  if (!selectedOutletId.value) {
    products.value = []
    return
  }
  productsLoading.value = true
  productsError.value = null
  try {
    // Products and the per-outlet topping catalog share the same outlet context.
    const [result] = await Promise.all([
      salesService.pos.products({
        page: 1,
        limit: PAGE_LIMIT,
        outletId: selectedOutletId.value,
        search: productSearch.value.trim() || undefined,
      }),
      loadPosToppings(),
    ])
    products.value = result.items
  } catch (error) {
    productsError.value = toMessage(error)
    products.value = []
  } finally {
    productsLoading.value = false
  }
}

function onSearchChange(value: string): void {
  productSearch.value = value
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    void loadProducts()
  }, 350)
}

// ── Modifier / add-to-cart ────────────────────────────────────────────
const selectedProduct = ref<PosProduct | null>(null)

function onSelectProduct(product: PosProduct): void {
  // MADE_TO_ORDER + hasToppings → open the modifier panel (global toppings).
  selectedProduct.value = product
}

function onAddDirect(product: PosProduct): void {
  // STOCK, or made-to-order without toppings → straight to cart, no toppings.
  cart.addItem(product, [])
}

function onAddFromModifier(toppings: PosToppingOption[]): void {
  if (selectedProduct.value) {
    cart.addItem(selectedProduct.value, toppings)
    selectedProduct.value = null
  }
}

// ── Blocked (unsellable) product alert ────────────────────────────────
// A click on an expired/out-of-stock card never reaches the cart (ProductGrid
// emits `blocked` instead of `add`/`select`); it surfaces here as a dismissible
// alert that reuses the view's existing error-banner style (`blockedAlert`
// declared above with the product state). The cart is never cleared and no
// panel is opened.
function onProductBlocked(payload: {
  product: PosProduct
  reason: 'EXPIRED' | 'OUT_OF_STOCK'
}): void {
  const name = payload.product.name
  blockedAlert.value =
    payload.reason === 'EXPIRED'
      ? `Stok ${name} sudah kedaluwarsa. Buat Production Order dulu untuk bisa menjual.`
      : `Stok ${name} habis. Terima barang (GR) atau buat Production Order dulu.`
}

// ── Open / close shift ────────────────────────────────────────────────
const openShiftModalOpen = ref<boolean>(false)
const openShiftSubmitting = ref<boolean>(false)
const openShiftError = ref<string | null>(null)

function openOpenShiftModal(): void {
  openShiftError.value = null
  openShiftModalOpen.value = true
}

async function onConfirmOpenShift(payload: {
  outletId: string
  openingCash: number
  notes: string
}): Promise<void> {
  openShiftSubmitting.value = true
  openShiftError.value = null
  try {
    const shift = await salesService.shifts.open({
      outletId: payload.outletId,
      openingCash: payload.openingCash,
      notes: payload.notes || undefined,
    })
    activeShift.value = shift
    selectedOutletId.value = shift.outletId
    openShiftModalOpen.value = false
    await loadProducts()
  } catch (error) {
    openShiftError.value = toMessage(error)
  } finally {
    openShiftSubmitting.value = false
  }
}

const closeShiftModalOpen = ref<boolean>(false)
const closeShiftSubmitting = ref<boolean>(false)
const closeShiftError = ref<string | null>(null)
const closeShiftResult = ref<Shift | null>(null)

function openCloseShiftModal(): void {
  closeShiftError.value = null
  closeShiftResult.value = null
  closeShiftModalOpen.value = true
}

async function onConfirmCloseShift(payload: { actualCash: number; notes: string }): Promise<void> {
  if (!activeShift.value) {
    return
  }
  closeShiftSubmitting.value = true
  closeShiftError.value = null
  try {
    const closed = await salesService.shifts.close(activeShift.value.id, {
      actualCash: payload.actualCash,
      notes: payload.notes || undefined,
    })
    closeShiftResult.value = closed
  } catch (error) {
    closeShiftError.value = toMessage(error)
  } finally {
    closeShiftSubmitting.value = false
  }
}

function onCloseShiftDone(): void {
  closeShiftModalOpen.value = false
  // Shift is closed → reset terminal state.
  activeShift.value = null
  closeShiftResult.value = null
  cart.clear()
  selectedProduct.value = null
  products.value = []
}

// ── Payment (TWO-STEP checkout → pay) ─────────────────────────────────
const paymentDrawerOpen = ref<boolean>(false)
const paySubmitting = ref<boolean>(false)
const payError = ref<string | null>(null)
// The authoritative total: the cart estimate until checkout, then the server grandTotal.
const checkoutTotal = ref<number>(0)
// Holds the created PENDING_PAYMENT order so a pay retry does not re-checkout.
const pendingOrder = ref<SalesOrder | null>(null)

const receiptOpen = ref<boolean>(false)
const paidOrder = ref<SalesOrder | null>(null)
const receiptChange = ref<number>(0)

/**
 * Cashier instructions appended to the two stock rejections POS can raise.
 *
 * The backend error envelope (`AllExceptionsFilter`) sends only a translated
 * `message` — the domain code itself (`SALES_ORDER.STOCK_EXPIRED`,
 * `INVENTORY.INSUFFICIENT_STOCK`) never reaches the browser — so these are
 * matched against the exact strings `DomainErrorTranslator` produces for them.
 * Anything else (topping not allowed, amount mismatch, …) passes through
 * `toMessage` untouched.
 *
 * The hint exists because POS never backflushes: the cashier cannot "let the
 * system make it", the only way to get sellable stock is a new Production Order
 * (or reducing the quantity in the basket).
 */
const CHECKOUT_STOCK_HINTS: ReadonlyArray<{ backendMessage: string; hint: string }> = [
  {
    backendMessage:
      'Stok produk sudah kedaluwarsa sehingga tidak bisa dijual; shortfall ini harus dipenuhi dengan membuat produksi baru lewat Production Order',
    hint: 'Buat Production Order untuk mengisi stok baru, atau kurangi jumlah di keranjang.',
  },
  {
    backendMessage: 'Stok tidak mencukupi untuk memenuhi jumlah yang diminta',
    hint: 'Kurangi jumlah di keranjang, atau buat Production Order untuk menambah stok.',
  },
]

interface CheckoutError {
  /** Message shown in the payment drawer. */
  message: string
  /** True for the two stock rejections — the grid is then reloaded so the
   *  availability badges reflect what the server actually has on hand. */
  isStockRejection: boolean
}

/** Normalize a checkout/pay failure into the message shown in the payment drawer. */
function toCheckoutError(error: unknown): CheckoutError {
  const message = toMessage(error)
  if (!(error instanceof ApiClientError)) {
    return { message, isStockRejection: false }
  }
  const hint = CHECKOUT_STOCK_HINTS.find((entry) => message.startsWith(entry.backendMessage))
  if (!hint) {
    return { message, isStockRejection: false }
  }
  return { message: `${message} — ${hint.hint}`, isStockRejection: true }
}

function openPaymentDrawer(): void {
  if (cart.isEmpty.value) {
    return
  }
  payError.value = null
  pendingOrder.value = null
  checkoutTotal.value = cart.grandTotal.value
  paymentDrawerOpen.value = true
}

function closePaymentDrawer(): void {
  if (paySubmitting.value) {
    return
  }
  paymentDrawerOpen.value = false
}

async function onConfirmPayment(payment: SalesPaymentInput): Promise<void> {
  if (!activeShift.value || !selectedOutletId.value) {
    return
  }
  paySubmitting.value = true
  payError.value = null
  try {
    // Step 1: checkout (create the order) if not already created.
    if (!pendingOrder.value) {
      const payload = cart.toCheckoutPayload(selectedOutletId.value, activeShift.value.id)
      const created = await salesService.orders.checkout(payload)
      pendingOrder.value = created
      // Use the SERVER grandTotal as the authoritative total.
      checkoutTotal.value = created.grandTotal
    }

    // Step 2: pay with a single payment of exactly the server grandTotal.
    const authoritativeTotal = pendingOrder.value.grandTotal
    const paid = await salesService.orders.pay(pendingOrder.value.id, {
      payments: [{ ...payment, amount: authoritativeTotal }],
    })

    // CASH change is tendered − grandTotal (display only; sent amount == total).
    receiptChange.value =
      payment.method === 'CASH' ? Math.max(payment.amount - authoritativeTotal, 0) : 0
    paidOrder.value = paid
    paymentDrawerOpen.value = false
    pendingOrder.value = null
    receiptOpen.value = true
  } catch (error) {
    // The basket is deliberately NOT cleared: the cashier keeps every line so
    // they can lower a quantity, drop the offending product, or retry. The
    // error goes through the existing `payError` → PaymentDrawer alert.
    const checkoutError = toCheckoutError(error)
    payError.value = checkoutError.message
    if (checkoutError.isStockRejection) {
      // Server-side availability differs from what the grid last showed, so
      // reload it to keep the disabled/reason badges honest.
      void loadProducts()
    }
  } finally {
    paySubmitting.value = false
  }
}

function onReceiptDone(): void {
  receiptOpen.value = false
  paidOrder.value = null
  receiptChange.value = 0
  cart.clear()
  selectedProduct.value = null
  // Refresh products so stock-driven availability reflects the sale.
  void loadProducts()
}

// Sales actions (checkout/pay) require sales.manage; shift open/close requires shift.manage.
const canManage = computed<boolean>(() => can('sales.manage'))
const canManageShift = computed<boolean>(() => can('shift.manage'))

onMounted(() => {
  void bootstrap()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <!-- Bootstrapping -->
    <div
      v-if="bootstrapping"
      class="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
    >
      Memuat terminal POS...
    </div>

    <template v-else>
      <!-- Bootstrap error -->
      <div
        v-if="bootstrapError"
        class="mb-5 rounded-2xl border border-error-500/40 bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        role="alert"
      >
        {{ bootstrapError }}
      </div>

      <!-- No accessible outlet -->
      <ComponentCard v-if="outlets.length === 0" title="Point of Sale">
        <div class="py-12 text-center">
          <p class="text-sm font-medium text-gray-600 dark:text-gray-300">
            Tidak ada outlet yang bisa diakses
          </p>
          <p class="mt-1 text-theme-sm text-gray-400 dark:text-gray-500">
            Hubungi admin untuk menetapkan outlet ke akun Anda.
          </p>
        </div>
      </ComponentCard>

      <template v-else>
        <!-- Outlet selector + shift bar -->
        <div class="mb-5 flex flex-col gap-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label class="text-theme-sm font-medium text-gray-700 dark:text-gray-400">Outlet</label>
            <div class="relative w-full sm:w-64">
              <select
                :value="selectedOutletId"
                class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                @change="onOutletChange(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              />
            </div>
          </div>

          <ShiftBar
            v-if="activeShift"
            :shift="activeShift"
            :outlet-name="selectedOutletName"
            :cashier-name="cashierName(activeShift.cashierUserId)"
            :can-manage="canManageShift"
            @close-shift="openCloseShiftModal"
          />
        </div>

        <!-- No OPEN shift → block terminal with CTA -->
        <ComponentCard v-if="!activeShift" title="Point of Sale">
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <p class="text-base font-medium text-gray-700 dark:text-gray-300">
              Belum ada shift kasir yang terbuka
            </p>
            <p class="mt-1 mb-6 text-theme-sm text-gray-400 dark:text-gray-500">
              Buka shift untuk mulai menerima transaksi di outlet {{ selectedOutletName }}.
            </p>
            <button
              v-if="canManageShift"
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
              @click="openOpenShiftModal"
            >
              <DoorOpen class="h-4 w-4" aria-hidden="true" />
              Buka Shift
            </button>
          </div>
        </ComponentCard>

        <!-- Terminal: three-area layout -->
        <div v-else class="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <!-- Left: product grid -->
          <div
            class="rounded-2xl border border-gray-200 bg-white p-4 lg:col-span-7 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <!-- Blocked (expired / out-of-stock) product alert — dismissible,
                 never clears the cart. Reuses the view's error-banner style. -->
            <div
              v-if="blockedAlert"
              class="mb-4 flex items-start justify-between gap-3 rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-700 dark:bg-warning-500/10 dark:text-warning-400"
              role="alert"
            >
              <span>{{ blockedAlert }}</span>
              <button
                type="button"
                aria-label="Tutup peringatan"
                title="Tutup peringatan"
                class="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-warning-600 transition hover:bg-warning-100 dark:text-warning-400 dark:hover:bg-warning-500/20"
                @click="blockedAlert = null"
              >
                <X class="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ProductGrid
              :products="products"
              :loading="productsLoading"
              :error-message="productsError"
              :search="productSearch"
              @update:search="onSearchChange"
              @select="onSelectProduct"
              @add="onAddDirect"
              @blocked="onProductBlocked"
            />
          </div>

          <!-- Center: modifier panel (MADE_TO_ORDER selection) -->
          <div class="lg:col-span-5 xl:col-span-2">
            <ModifierPanel
              v-if="selectedProduct"
              :product="selectedProduct"
              :toppings="posToppings"
              @add="onAddFromModifier"
              @cancel="selectedProduct = null"
            />
            <div
              v-else
              class="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-gray-200 p-4 text-center text-theme-sm text-gray-400 dark:border-gray-700 dark:text-gray-500"
            >
              Pilih produk buat-sesuai-pesanan untuk memilih topping.
            </div>
          </div>

          <!-- Right: cart -->
          <div class="lg:col-span-12 xl:col-span-3">
            <CartPanel
              :lines="cart.lines.value"
              :subtotal="cart.subtotal.value"
              :grand-total="cart.grandTotal.value"
              :order-discount="cart.orderDiscount.value"
              :customer-name="cart.customerName.value"
              :line-total="cart.lineTotal"
              :is-empty="cart.isEmpty.value"
              :can-manage="canManage"
              @update:order-discount="(v) => (cart.orderDiscount.value = v >= 0 ? v : 0)"
              @update:customer-name="(v) => (cart.customerName.value = v)"
              @set-qty="cart.setQty"
              @set-item-discount="cart.setItemDiscount"
              @remove="cart.removeLine"
              @pay="openPaymentDrawer"
            />
          </div>
        </div>
      </template>
    </template>

    <!-- Open shift modal -->
    <OpenShiftModal
      :open="openShiftModalOpen"
      :outlets="outlets"
      :default-outlet-id="selectedOutletId"
      :submitting="openShiftSubmitting"
      :error-message="openShiftError"
      @close="openShiftModalOpen = false"
      @confirm="onConfirmOpenShift"
    />

    <!-- Close shift modal -->
    <CloseShiftModal
      :open="closeShiftModalOpen"
      :submitting="closeShiftSubmitting"
      :error-message="closeShiftError"
      :result="closeShiftResult"
      @close="closeShiftResult ? onCloseShiftDone() : (closeShiftModalOpen = false)"
      @confirm="onConfirmCloseShift"
    />

    <!-- Payment drawer -->
    <PaymentDrawer
      :open="paymentDrawerOpen"
      :grand-total="checkoutTotal"
      :submitting="paySubmitting"
      :error-message="payError"
      @close="closePaymentDrawer"
      @confirm="onConfirmPayment"
    />

    <!-- Receipt dialog -->
    <ReceiptDialog
      :open="receiptOpen"
      :order="paidOrder"
      :change="receiptChange"
      @done="onReceiptDone"
    />
  </AdminLayout>
</template>
