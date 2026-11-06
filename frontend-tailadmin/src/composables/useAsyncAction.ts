import { ref } from 'vue'
import { toMessage } from '@/lib/errors'

/**
 * Menyatukan pola aksi async ke server: state `loading`, pesan error, dan pesan
 * sukses. Sebelumnya pola `loading = true → try → catch(toMessage) → finally`
 * ditulis berulang di setiap form/panel.
 *
 * Pemakaian:
 *   const { loading, errorMessage, successMessage, run } = useAsyncAction()
 *   const created = await run(() => service.create(payload), 'Data tersimpan.')
 *   if (!created) return   // errorMessage sudah terisi
 */
export function useAsyncAction() {
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  const successMessage = ref<string | null>(null)

  function reset(): void {
    errorMessage.value = null
    successMessage.value = null
  }

  /** Jalankan `action`; kembalikan hasilnya, atau null bila gagal (pesan sudah diisi). */
  async function run<T>(action: () => Promise<T>, successText?: string): Promise<T | null> {
    loading.value = true
    reset()
    try {
      const result = await action()
      if (successText) {
        successMessage.value = successText
      }
      return result
    } catch (error) {
      errorMessage.value = toMessage(error)
      return null
    } finally {
      loading.value = false
    }
  }

  return { loading, errorMessage, successMessage, run, reset }
}
