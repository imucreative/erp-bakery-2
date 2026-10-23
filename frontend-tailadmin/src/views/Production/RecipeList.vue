<script setup lang="ts">
/**
 * RecipeList — thin controller for the Recipes (BOM) list page. List state
 * (pagination/search/status + product filter) lives in `useRecipes`; the
 * toolbar and table are separate feature components. Product names come from
 * recipe records, so product.read is not needed to view recipes.
 * "Buat" and row "detail" navigate to dedicated full pages (the form is a page,
 * not a modal).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseTablePagination } from '@/components/ui'
import { RecipeFilterBar, RecipeTable } from '@/components/production/recipe'
import { usePermission } from '@/composables/usePermission'
import { useRecipes } from '@/composables/useRecipes'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { recipeService, type Recipe } from '@/services/recipe.service'

const pageTitle = 'Recipe'
const route = useRoute()
const router = useRouter()
const { can } = usePermission()
const canManage = computed<boolean>(() => can('recipe.manage'))

// Success feedback after a draft recipe was deleted on the detail page
// (redirected here with ?deleted=1). Dismissible; cleared from the URL on mount.
const deletedNotice = ref<boolean>(false)

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  statusFilter,
  productFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useRecipes()

// Derive filter options from recipes the user can already read.
const productOptions = ref<{ id: string; label: string }[]>([])

async function loadLookups(): Promise<void> {
  try {
    const allRecipes = await fetchAllPaginated((page) =>
      recipeService.list({ page, limit: PAGE_LIMIT }),
    )
    const productsById = new Map<string, string>()
    for (const recipe of allRecipes) {
      if (recipe.productName) {
        productsById.set(recipe.productId, recipe.productName)
      }
    }
    productOptions.value = [...productsById]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  } catch {
    // Non-fatal: recipe rows still carry their product names.
    productOptions.value = []
  }
}

function goToCreate(): void {
  void router.push({ name: 'ProductionRecipeCreate' })
}

function goToDetail(recipe: Recipe): void {
  void router.push({ name: 'ProductionRecipeDetail', params: { id: recipe.id } })
}

function dismissDeletedNotice(): void {
  deletedNotice.value = false
}

onMounted(() => {
  if (route.query.deleted === '1') {
    deletedNotice.value = true
    // Strip the flag so a refresh/back doesn't re-show the banner.
    void router.replace({ name: 'ProductionRecipes' })
  }
  void loadLookups()
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <div
      v-if="deletedNotice"
      class="alert-success mb-4 flex items-start justify-between gap-3 px-4 py-3"
      role="status"
    >
      <span class="flex items-center gap-2">
        <CheckCircle2 class="h-4 w-4 shrink-0" aria-hidden="true" />
        Resep draft berhasil dihapus.
      </span>
      <BaseButton
        variant="outline"
        size="sm"
        class="text-success-600 underline-offset-2 hover:underline dark:text-success-500"
        @click="dismissDeletedNotice"
      >
        Tutup
      </BaseButton>
    </div>

    <ComponentCard
      title="Recipe"
      desc="Kelola resep produksi (Bill of Materials) berversi: susun bahan, aktifkan, atau arsipkan."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <RecipeFilterBar
          v-model:search="search"
          v-model:status="statusFilter"
          v-model:product="productFilter"
          :products="productOptions"
        />
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="goToCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Buat Resep
        </BaseButton>
      </div>

      <RecipeTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        @view="goToDetail"
      />

      <!-- Pagination -->
      <BaseTablePagination
        v-if="!loading && !errorMessage && items.length > 0"
        :current-count="items.length"
        :total-items="meta.total"
        :current-page="page"
        :total-pages="totalPages"
        :has-previous="canPrev"
        :has-next="canNext"
        @previous="prevPage"
        @next="nextPage"
      />
    </ComponentCard>
  </AdminLayout>
</template>
