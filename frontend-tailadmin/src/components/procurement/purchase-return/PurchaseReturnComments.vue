<script setup lang="ts">
/**
 * PurchaseReturnComments — comment thread for a Purchase Return detail page.
 *
 * Reads `GET /purchase-returns/:id/comments` (chronological) and renders each
 * entry with the author name (fallback "Pengguna" when null), a colored
 * category badge (INTERNAL/APPROVAL/EXTERNAL/SYSTEM), the body, and the
 * Jakarta-formatted timestamp.
 *
 * The add-comment form posts `POST /purchase-returns/:id/comments` with a
 * non-empty `body` and a user-selected `category` (INTERNAL/APPROVAL/EXTERNAL,
 * default INTERNAL). SYSTEM is display-only and is never submitted. Empty body
 * is blocked locally; backend errors surface inline and keep the user on the
 * page with their draft preserved on failure. On success the list is refreshed
 * and the textarea cleared.
 */
import { onMounted, ref } from 'vue'
import { Send } from 'lucide-vue-next'
import { ApiClientError } from '@/services/http'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseSelect, BaseTextarea } from '@/components/ui'
import { formatDateTime } from '@/lib/format'
import {
  purchaseReturnService,
  commentCategoryBadgeColor,
  PURCHASE_RETURN_COMMENT_CATEGORIES,
  PURCHASE_RETURN_COMMENT_CATEGORY_LABELS,
  type PurchaseReturnComment,
  type PurchaseReturnCommentCategory,
} from '@/services/purchase-return.service'

const props = defineProps<{
  purchaseReturnId: string
}>()

const comments = ref<PurchaseReturnComment[]>([])
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)

const body = ref<string>('')
const category = ref<PurchaseReturnCommentCategory>('INTERNAL')
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const categoryOptions = PURCHASE_RETURN_COMMENT_CATEGORIES.map((value) => ({
  value,
  label: PURCHASE_RETURN_COMMENT_CATEGORY_LABELS[value],
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

function authorLabel(comment: PurchaseReturnComment): string {
  return comment.authorName?.trim() || 'Pengguna'
}

async function loadComments(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    comments.value = await purchaseReturnService.listComments(props.purchaseReturnId)
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
    await purchaseReturnService.addComment(props.purchaseReturnId, {
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
    <p
      v-if="loading"
      class="text-muted rounded-lg border border-gray-200 bg-gray-50 px-3 py-6 text-center dark:border-gray-800 dark:bg-white/[0.02]"
    >
      Memuat komentar...
    </p>

    <!-- Load error -->
    <p v-else-if="loadError" class="alert-error px-3 py-2" role="alert">
      {{ loadError }}
    </p>

    <template v-else>
      <!-- Empty -->
      <p
        v-if="comments.length === 0"
        class="text-muted rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center dark:border-gray-800 dark:bg-white/[0.02]"
      >
        Belum ada komentar.
      </p>

      <!-- Comment list (chronological) -->
      <ul v-else class="space-y-4">
        <li
          v-for="comment in comments"
          :key="comment.id"
          class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]"
        >
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ authorLabel(comment) }}
            </span>
            <Badge :color="commentCategoryBadgeColor(comment.category)">
              {{ PURCHASE_RETURN_COMMENT_CATEGORY_LABELS[comment.category] }}
            </Badge>
            <span class="text-theme-xs text-gray-400 dark:text-gray-500 ms-auto">
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
        <label for="pr-comment-body" class="form-label"> Tambah Komentar </label>
        <BaseTextarea
          id="pr-comment-body"
          :model-value="body"
          :rows="3"
          placeholder="Tulis komentar..."
          @update:model-value="body = $event"
        />
      </div>

      <div class="toolbar-row">
        <div class="relative w-full sm:w-48">
          <BaseSelect
            id="pr-comment-category"
            :model-value="category"
            :options="categoryOptions"
            aria-label="Kategori komentar"
            @update:model-value="category = $event as PurchaseReturnCommentCategory"
          />
        </div>

        <BaseButton
          type="submit"
          variant="primary"
          :loading="submitting"
          loading-text="Mengirim..."
        >
          <Send class="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {{ submitting ? 'Mengirim...' : 'Kirim' }}
        </BaseButton>
      </div>

      <p v-if="formError" class="alert-error px-3 py-2" role="alert">
        {{ formError }}
      </p>
    </form>
  </div>
</template>
