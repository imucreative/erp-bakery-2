<script setup lang="ts">
/**
 * RecipeDetail — full-page read-only view of a Recipe (BOM): header meta
 * (summary) + ingredient items. Renders status- and permission-aware lifecycle
 * actions (canTransition is mirrored from the backend — actions outside the
 * current transition are never shown):
 *
 *   DRAFT    → Edit (recipe.manage), Activate (recipe.manage), Archive (recipe.manage), Delete (recipe.manage)
 *   ACTIVE   → Archive (recipe.manage)   [NOT editable; cannot return to DRAFT; NOT deletable]
 *   ARCHIVED → Duplicate to Draft (recipe.manage), Delete (recipe.manage)   [terminal lifecycle]
 *
 * The backend lifecycle endpoints take no body, so each action is a plain
 * confirmation modal. Mutations keep the user on the page; backend errors
 * (notably 409 "another active recipe exists for the product" on activate)
 * surface in the modal, keeping the current state intact.
 *
 * The entity exposes no status-log collection, so there is no timeline section.
 * This view owns all state and handlers; presentation is delegated to stateless
 * feature sub-components (summary, items table, action bar, modals). Product
 * and UOM labels are returned with the recipe, without product.read or uom.read.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
import {
  RecipeSummary,
  RecipeItemsTable,
  RecipeActionBar,
  RecipeActionModals,
  type RecipeAction,
} from '@/components/production/recipe'
import { usePermission } from '@/composables/usePermission'
import { useRecipeDraft } from '@/composables/useRecipeDraft'
import { toMessage } from '@/composables/useStockLedger'
import {
  recipeService,
  RECIPE_STATUS_LABELS,
  statusBadgeColor,
  type Recipe,
} from '@/services/recipe.service'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()
const { setDraft } = useRecipeDraft()

const recipeId = computed<string>(() => String(route.params.id))

const recipe = ref<Recipe | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

function productName(id: string): string {
  if (recipe.value?.productId === id && recipe.value.productName) {
    return recipe.value.productName
  }
  return (
    recipe.value?.items.find((item) => item.ingredientProductId === id)?.ingredientProductName ?? id
  )
}
function uomName(id: string): string {
  if (recipe.value?.yieldUomId === id) {
    return recipe.value.yieldUomName ?? id
  }
  return recipe.value?.items.find((item) => item.uomId === id)?.uomName ?? id
}

// ── Permission + status → available actions ──────────────────────────
const canManage = computed<boolean>(() => can('recipe.manage'))
const status = computed<Recipe['status'] | null>(() => recipe.value?.status ?? null)

const showEdit = computed<boolean>(() => canManage.value && status.value === 'DRAFT')
const showActivate = computed<boolean>(() => canManage.value && status.value === 'DRAFT')
const showArchive = computed<boolean>(
  () => canManage.value && (status.value === 'DRAFT' || status.value === 'ACTIVE'),
)
// Soft-delete is allowed for DRAFT and ARCHIVED (backend rejects only ACTIVE with
// 400 RECIPE.ACTIVE_NOT_DELETABLE). Duplicate turns a terminal ARCHIVED recipe
// into a brand-new create draft (frontend-only prefill).
const showDelete = computed<boolean>(
  () => canManage.value && (status.value === 'DRAFT' || status.value === 'ARCHIVED'),
)
const showDuplicate = computed<boolean>(() => canManage.value && status.value === 'ARCHIVED')
const hasAnyAction = computed<boolean>(
  () =>
    showEdit.value ||
    showActivate.value ||
    showArchive.value ||
    showDelete.value ||
    showDuplicate.value,
)

// ── Load ─────────────────────────────────────────────────────────────
async function loadRecipe(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    recipe.value = await recipeService.getById(recipeId.value)
  } catch (error) {
    loadError.value = toMessage(error)
    recipe.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadRecipe()
})

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<RecipeAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToEdit(): void {
  void router.push({ name: 'ProductionRecipeEdit', params: { id: recipeId.value } })
}

function goToList(): void {
  void router.push({ name: 'ProductionRecipes' })
}

function openAction(action: RecipeAction): void {
  activeAction.value = action
  actionError.value = null
}

async function onConfirmAction(): Promise<void> {
  if (!recipe.value || !activeAction.value) {
    return
  }
  const id = recipe.value.id
  const current = recipe.value
  const action = activeAction.value
  actionSubmitting.value = true
  actionError.value = null
  try {
    if (action === 'delete') {
      // Soft-delete returns only the id; the recipe leaves the list, so redirect
      // there with a success flag. Errors (400/404) stay on this page.
      await recipeService.remove(id)
      activeAction.value = null
      void router.push({ name: 'ProductionRecipes', query: { deleted: '1' } })
      return
    }
    const updated =
      action === 'activate' ? await recipeService.activate(id) : await recipeService.archive(id)
    recipe.value = {
      ...updated,
      productName: current.productName,
      yieldUomName: current.yieldUomName,
      items: updated.items.map((item) => ({
        ...item,
        ingredientProductName: current.items.find(
          (current) => current.ingredientProductId === item.ingredientProductId,
        )?.ingredientProductName,
        uomName: current.items.find((currentItem) => currentItem.uomId === item.uomId)?.uomName,
      })),
    }
    activeAction.value = null
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}

/**
 * "Duplikat ke Draft" — copy an ARCHIVED recipe's editable data into a transient
 * draft and open the create form. recipeNumber/version/status are intentionally
 * dropped (the backend assigns a fresh DRAFT v1). The finished product IS copied,
 * but the create picker hides products that already own a DRAFT/ACTIVE recipe —
 * so the user may need to pick another product (expected per the one-live-recipe
 * rule).
 */
function onDuplicate(): void {
  if (!recipe.value) {
    return
  }
  const source = recipe.value
  setDraft({
    name: `${source.name} (Salinan)`,
    yieldQty: source.yieldQty,
    yieldUomId: source.yieldUomId,
    instructions: source.instructions ?? '',
    items: source.items.map((item) => ({
      ingredientProductId: item.ingredientProductId,
      qty: item.qty,
      uomId: item.uomId,
      lossPercentage: item.lossPercentage,
    })),
  })
  void router.push({ name: 'ProductionRecipeCreate' })
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="'Detail Resep'" />

    <div v-if="loading" class="panel-loading">Memuat data...</div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-error-500/40 bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ loadError }}
    </div>

    <template v-else-if="recipe">
      <!-- Page header: back (icon-only) + title/number/status/version on the start, actions on the end -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <BaseButton
            variant="outline"
            icon-only
            aria-label="Kembali ke Daftar"
            title="Kembali ke Daftar"
            class="h-10 w-10"
            @click="goToList"
          >
            <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </BaseButton>
          <div class="flex flex-col gap-1">
            <h3 class="card-title">
              {{ recipe.name }}
            </h3>
            <div class="flex items-center gap-2">
              <span class="text-muted"> {{ recipe.recipeNumber }} · v{{ recipe.version }} </span>
              <Badge :color="statusBadgeColor(recipe.status)">
                {{ RECIPE_STATUS_LABELS[recipe.status] }}
              </Badge>
            </div>
          </div>
        </div>

        <RecipeActionBar
          v-if="hasAnyAction"
          :show-edit="showEdit"
          :show-activate="showActivate"
          :show-archive="showArchive"
          :show-delete="showDelete"
          :show-duplicate="showDuplicate"
          :submitting="actionSubmitting"
          @edit="goToEdit"
          @activate="openAction('activate')"
          @archive="openAction('archive')"
          @delete="openAction('delete')"
          @duplicate="onDuplicate"
        />
      </div>

      <div class="grid grid-cols-1 gap-5">
        <ComponentCard title="Informasi Resep">
          <!-- Action error banner (mutation failures keep user here) -->
          <p v-if="actionError" class="alert-error mb-4 px-3 py-2">
            {{ actionError }}
          </p>

          <RecipeSummary :recipe="recipe" :product-name="productName" :uom-name="uomName" />

          <div class="mt-6">
            <h5 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Bahan</h5>
            <RecipeItemsTable :recipe="recipe" :product-name="productName" :uom-name="uomName" />
          </div>

          <p v-if="!hasAnyAction" class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada aksi untuk status ini.
          </p>
        </ComponentCard>
      </div>
    </template>

    <RecipeActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
