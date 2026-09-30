<script setup lang="ts">
/**
 * PurchaseRequestComments — comment thread for a Purchase Request detail page.
 *
 * Reads `GET /purchase-requests/:id/comments` (chronological, created_at ASC)
 * and renders each entry with the author name (fallback "Pengguna" when null),
 * a colored category badge (INTERNAL/APPROVAL/EXTERNAL/SYSTEM), the body, and
 * the Jakarta-formatted timestamp.
 *
 * The add-comment form posts `POST /purchase-requests/:id/comments` with a
 * non-empty `body` and a user-selected `category` (INTERNAL/APPROVAL/EXTERNAL,
 * default INTERNAL). SYSTEM is display-only and is never submitted. Empty body
 * is blocked locally; backend errors (400/404) surface inline and keep the user
 * on the page with their draft preserved on failure. On success the list is
 * refreshed and the textarea cleared.
 *
 * Both read and submit require `procurement.pr.read`, which the viewer already
 * holds if they can see the detail page.
 */
import { onMounted, ref } from 'vue'
import { ApiClientError } from '@/services/http'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import Badge from '@/components/ui/Badge.vue'
import { formatDateTime } from '@/lib/format'
import {
  purchaseRequestService,
  commentCategoryBadgeColor,
  PURCHASE_REQUEST_COMMENT_CATEGORIES,
  PURCHASE_REQUEST_COMMENT_CATEGORY_LABELS,
  type PurchaseRequestComment,
  type PurchaseRequestCommentCategory,
} from '@/services/purchase-request.service'

const props = defineProps<{
  purchaseRequestId: string
}>()

const comments = ref<PurchaseRequestComment[]>([])
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)

const body = ref<string>('')
const category = ref<PurchaseRequestCommentCategory>('INTERNAL')
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

function authorLabel(comment: PurchaseRequestComment): string {
  return comment.authorName?.trim() || 'Pengguna'
}

async function loadComments(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    comments.value = await purchaseRequestService.listComments(props.purchaseRequestId)
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
    await purchaseRequestService.addComment(props.purchaseRequestId, {
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
      class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400"
    >
      Memuat komentar...
    </p>

    <!-- Load error -->
    <p
      v-else-if="loadError"
      class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ loadError }}
    </p>

    <template v-else>
      <!-- Empty -->
      <p
        v-if="comments.length === 0"
        class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400"
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
              {{ PURCHASE_REQUEST_COMMENT_CATEGORY_LABELS[comment.category] }}
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
    <form class="space-y-3 border-t border-gray-100 pt-5 dark:border-gray-800" @submit.prevent="submitComment">
      <div>
        <label
          for="pr-comment-body"
          class="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-400"
        >
          Tambah Komentar
        </label>
        <textarea
          id="pr-comment-body"
          v-model="body"
          rows="3"
          placeholder="Tulis komentar..."
          class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        ></textarea>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:w-48">
          <select
            v-model="category"
            aria-label="Kategori komentar"
            class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option v-for="c in PURCHASE_REQUEST_COMMENT_CATEGORIES" :key="c" :value="c">
              {{ PURCHASE_REQUEST_COMMENT_CATEGORY_LABELS[c] }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          />
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ submitting ? 'Mengirim...' : 'Kirim' }}
        </button>
      </div>

      <p
        v-if="formError"
        class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        role="alert"
      >
        {{ formError }}
      </p>
    </form>
  </div>
</template>
