<script setup lang="ts">
/**
 * PurchaseReturnAttachments — attachment list + upload for a PR detail page.
 *
 * Reads `GET /purchase-returns/:id/attachments` and renders each file with a
 * mime-based icon, original name, size, uploader (fallback "—") and timestamp.
 * Per-row icon-only actions: Download (any reader) and Delete (only when
 * `canManage`, behind an inline confirmation).
 *
 * When `canManage`, an upload area accepts a single PDF/JPG/PNG file up to
 * 5 MB. Client-side validation blocks the wrong type/size before sending, but
 * the backend remains authoritative. Uploads go through `FormData` (field
 * `file`); the browser sets the multipart boundary — we never set the
 * Content-Type manually. Download uses a blob + Bearer request and triggers a
 * browser save with the original filename.
 */
import { computed, onMounted, ref } from 'vue'
import { Download, FileText, ImageIcon, Paperclip, Trash2, UploadCloud } from 'lucide-vue-next'
import { ApiClientError } from '@/services/http'
import { BaseButton } from '@/components/ui'
import { formatDateTime, formatFileSize } from '@/lib/format'
import {
  purchaseReturnService,
  type PurchaseReturnAttachment,
} from '@/services/purchase-return.service'

const props = defineProps<{
  purchaseReturnId: string
  canManage: boolean
}>()

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const
const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png'

const attachments = ref<PurchaseReturnAttachment[]>([])
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)

// Upload state
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const uploading = ref<boolean>(false)
const uploadError = ref<string | null>(null)

// Per-row action state
const downloadingId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const deletingId = ref<string | null>(null)

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

function uploaderLabel(attachment: PurchaseReturnAttachment): string {
  return attachment.uploadedByName?.trim() || '—'
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

async function loadAttachments(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    attachments.value = await purchaseReturnService.listAttachments(props.purchaseReturnId)
  } catch (error) {
    loadError.value = toMessage(error)
    attachments.value = []
  } finally {
    loading.value = false
  }
}

// ── Upload ───────────────────────────────────────────────────────────
function onFileChange(event: Event): void {
  uploadError.value = null
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  selectedFile.value = file
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return 'Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Ukuran file melebihi batas 5 MB (${formatFileSize(file.size)}).`
  }
  return null
}

function resetFileInput(): void {
  selectedFile.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function uploadSelected(): Promise<void> {
  const file = selectedFile.value
  if (!file) {
    uploadError.value = 'Pilih file terlebih dahulu.'
    return
  }
  const validationError = validateFile(file)
  if (validationError) {
    uploadError.value = validationError
    return
  }
  uploadError.value = null
  uploading.value = true
  try {
    await purchaseReturnService.uploadAttachment(props.purchaseReturnId, file)
    resetFileInput()
    await loadAttachments()
  } catch (error) {
    // Keep the user here with the selection intact; surface the backend error.
    uploadError.value = toMessage(error)
  } finally {
    uploading.value = false
  }
}

// ── Download ─────────────────────────────────────────────────────────
async function download(attachment: PurchaseReturnAttachment): Promise<void> {
  downloadingId.value = attachment.id
  try {
    await purchaseReturnService.downloadAttachment(
      props.purchaseReturnId,
      attachment.id,
      attachment.originalName,
    )
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    downloadingId.value = null
  }
}

// ── Delete (inline confirm) ──────────────────────────────────────────
function requestDelete(id: string): void {
  confirmDeleteId.value = id
}

function cancelDelete(): void {
  confirmDeleteId.value = null
}

async function confirmDelete(attachment: PurchaseReturnAttachment): Promise<void> {
  deletingId.value = attachment.id
  try {
    await purchaseReturnService.deleteAttachment(props.purchaseReturnId, attachment.id)
    confirmDeleteId.value = null
    await loadAttachments()
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    deletingId.value = null
  }
}

const hasSelection = computed<boolean>(() => selectedFile.value !== null)

onMounted(() => {
  void loadAttachments()
})
</script>

<template>
  <div class="space-y-5">
    <!-- Loading -->
    <p
      v-if="loading"
      class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400"
    >
      Memuat lampiran...
    </p>

    <!-- Load / action error -->
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
        v-if="attachments.length === 0"
        class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-theme-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400"
      >
        Belum ada lampiran.
      </p>

      <!-- Attachment list -->
      <ul v-else class="space-y-3">
        <li
          v-for="attachment in attachments"
          :key="attachment.id"
          class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02]"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-gray-400"
            >
              <ImageIcon v-if="isImage(attachment.mimeType)" class="h-5 w-5" aria-hidden="true" />
              <FileText v-else class="h-5 w-5" aria-hidden="true" />
            </span>

            <div class="min-w-0 flex-1">
              <p class="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ attachment.originalName }}
              </p>
              <p class="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">
                {{ formatFileSize(attachment.sizeBytes) }} · {{ uploaderLabel(attachment) }} ·
                {{ formatDateTime(attachment.createdAt) }}
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-1">
              <BaseButton
                size="sm"
                variant="outline"
                icon-only
                type="button"
                :disabled="downloadingId === attachment.id"
                :title="'Unduh'"
                :aria-label="`Unduh ${attachment.originalName}`"
                @click="download(attachment)"
              >
                <Download class="h-5 w-5" aria-hidden="true" />
              </BaseButton>
              <BaseButton
                v-if="canManage"
                size="sm"
                variant="danger"
                icon-only
                type="button"
                :title="'Hapus'"
                :aria-label="`Hapus ${attachment.originalName}`"
                @click="requestDelete(attachment.id)"
              >
                <Trash2 class="h-5 w-5" aria-hidden="true" />
              </BaseButton>
            </div>
          </div>

          <!-- Inline delete confirmation -->
          <div
            v-if="canManage && confirmDeleteId === attachment.id"
            class="mt-3 flex flex-col gap-3 rounded-lg border border-error-500/30 bg-error-50 px-3 py-2.5 dark:bg-error-500/10 sm:flex-row sm:items-center sm:justify-between"
          >
            <span class="text-theme-sm text-error-600 dark:text-error-400">
              Hapus lampiran ini? Tindakan ini permanen.
            </span>
            <div class="flex items-center gap-2">
              <BaseButton
                size="sm"
                variant="outline"
                :disabled="deletingId === attachment.id"
                @click="cancelDelete"
              >
                Batal
              </BaseButton>
              <BaseButton
                size="sm"
                variant="danger"
                :loading="deletingId === attachment.id"
                loading-text="Menghapus..."
                :disabled="deletingId === attachment.id"
                @click="confirmDelete(attachment)"
              >
                Hapus
              </BaseButton>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <!-- Upload area (only when the viewer can manage) -->
    <form
      v-if="canManage"
      class="space-y-3 border-t border-gray-100 pt-5 dark:border-gray-800"
      @submit.prevent="uploadSelected"
    >
      <label class="mb-1.5 block text-theme-sm font-medium text-gray-700 dark:text-gray-400">
        Unggah Lampiran
      </label>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label
          class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          <Paperclip class="h-4 w-4" aria-hidden="true" />
          Pilih File
          <input
            ref="fileInput"
            type="file"
            class="sr-only"
            :accept="ACCEPT_ATTR"
            @change="onFileChange"
          />
        </label>

        <span
          class="min-w-0 flex-1 truncate text-theme-sm text-gray-500 dark:text-gray-400"
          :class="{ 'text-gray-800 dark:text-white/90': hasSelection }"
        >
          {{
            selectedFile
              ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
              : 'PDF, JPG, atau PNG · maks 5 MB'
          }}
        </span>

        <BaseButton
          type="submit"
          variant="primary"
          :loading="uploading"
          loading-text="Mengunggah..."
          :disabled="!hasSelection"
        >
          <UploadCloud class="h-4 w-4" aria-hidden="true" />
          Unggah
        </BaseButton>
      </div>

      <p
        v-if="uploadError"
        class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-theme-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        role="alert"
      >
        {{ uploadError }}
      </p>
    </form>
  </div>
</template>
