import { ApiClientError } from '@/services/http'

/**
 * Ubah error apa pun menjadi pesan yang layak ditampilkan ke pengguna.
 * Sebelumnya fungsi ini disalin identik di banyak komponen.
 */
export function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}
