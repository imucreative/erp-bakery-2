<script setup lang="ts">
/**
 * PurchaseOrderComments — comment thread for a Purchase Order detail page.
 *
 * Reads `GET /purchase-orders/:id/comments` (chronological, created_at ASC)
 * and renders each entry with the author name (fallback "Pengguna" when null),
 * a colored category badge (INTERNAL/APPROVAL/EXTERNAL/SYSTEM), the body, and
 * the Jakarta-formatted timestamp.
 *
 * The add-comment form posts `POST /purchase-orders/:id/comments` with a
 * non-empty `body` and a user-selected `category` (INTERNAL/APPROVAL/EXTERNAL,
 * default INTERNAL). SYSTEM is display-only and is never submitted. Empty body
 * is blocked locally; backend errors (400/404) surface inline and keep the user
 * on the page with their draft preserved on failure. On success the list is
 * refreshed and the textarea cleared.
 *
 * Both read and submit require `procurement.po.read`, which the viewer already
 * holds if they can see the detail page.
 */
import { onMounted, ref } from 'vue'
import { Send } from 'lucide-vue-next'
import { ApiClientError } from '@/services/http'
import Badge from '@/components/ui/Badge.vue'
import { BaseAlert, BaseButton, BaseSelect, BaseTextarea } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import {
  purchaseOrderService,
  commentCategoryBadgeColor,
  PURCHASE_ORDER_COMMENT_CATEGORIES,
  PURCHASE_ORDER_COMMENT_CATEGORY_LABELS,
  type PurchaseOrderComment,
  type PurchaseOrderCommentCategory,
} from '@/services/purchase-order.service'

const props = defineProps<{
  purchaseOrderId: string
}>()

const comments = ref<PurchaseOrderComment[]>([])
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)

const body = ref<string>('')
const category = ref<PurchaseOrderCommentCategory>('INTERNAL')
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

const commentCategoryOptions = PURCHASE_ORDER_COMMENT_CATEGORIES.map((categoryValue) => ({
  value: categoryValue,
  label: PURCHASE_ORDER_COMMENT_CATEGORY_LABELS[categoryValue],
}))

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const details = error.fieldErrors
      .map((item) => item.message)
      .filter((message): message is string => Boolean(message))
    if (details.length > 0) {
      return `${error.message}: ${details.join('; ')}`
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

function authorLabel(comment: PurchaseOrderComment): string {
  return comment.authorName?.trim() || 'Pengguna'
}

async function loadComments(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    comments.value = await purchaseOrderService.listComments(props.purchaseOrderId)
  } catch (error) {
    loadError.value = toMessage(error)
    comments.value = []
  } finally {
    loading.value = false
  }
}

async function submitComment(): Promise<void> {
  const trimmed = body.value.trim()
  if (trimmed.length === 0) {
    formError.value = 'Komentar tidak boleh kosong.'
    return
  }
  formError.value = null
  submitting.value = true
  try {
    await purchaseOrderService.addComment(props.purchaseOrderId, {
      body: trimmed,
      category: category.value,
    })
    body.value = ''
    category.value = 'INTERNAL'
    await loadComments()
  } catch (error) {
    // Keep the user on the page with their draft intact; surface the error.
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadComments()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Loading -->
    <p v-if="loading" class="panel-muted">Memuat komentar...</p>

    <!-- Load error -->
    <BaseAlert v-else-if="loadError" :message="loadError" size="sm" />

    <template v-else>
      <!-- Empty -->
      <p v-if="comments.length === 0" class="panel-muted border-dashed">Belum ada komentar.</p>

      <!-- Comment list (chronological) -->
      <ul v-else class="space-y-4">
        <li v-for="comment in comments" :key="comment.id" class="panel-card">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="text-strong">
              {{ authorLabel(comment) }}
            </span>
            <Badge :color="commentCategoryBadgeColor(comment.category)">
              {{ PURCHASE_ORDER_COMMENT_CATEGORY_LABELS[comment.category] }}
            </Badge>
            <span class="text-muted-xs ms-auto">
              {{ formatDateTime(comment.createdAt) }}
            </span>
          </div>
          <p class="whitespace-pre-wrap text-theme-sm text-gray-700 dark:text-gray-300">
            {{ comment.body }}
          </p>
        </li>
      </ul>
    </template>

    <!-- Add-comment form -->
    <form
      class="space-y-3 border-t border-gray-100 pt-5 dark:border-gray-800"
      @submit.prevent="submitComment"
    >
      <div>
        <label for="po-comment-body" class="form-label"> Tambah Komentar </label>
        <BaseTextarea
          id="po-comment-body"
          :model-value="body"
          :rows="3"
          placeholder="Tulis komentar..."
          @update:model-value="body = $event"
        />
      </div>

      <div class="toolbar-row">
        <div class="relative w-full sm:w-48">
          <BaseSelect
            id="po-comment-category"
            :model-value="category"
            :options="commentCategoryOptions"
            aria-label="Kategori komentar"
            @update:model-value="category = $event as PurchaseOrderCommentCategory"
          />
        </div>

        <BaseButton
          type="submit"
          variant="primary"
          :loading="submitting"
          loading-text="Mengirim..."
        >
          <template #start-icon
            ><Send class="h-4 w-4 rtl:-scale-x-100" aria-hidden="true"
          /></template>
          Kirim
        </BaseButton>
      </div>

      <BaseAlert v-if="formError" :message="formError" size="sm" />
    </form>
  </div>
</template>
