import { ApiClientError } from '@/services/http'

/**
 * Ubah error apa pun menjadi pesan yang layak ditampilkan ke pengguna.
 * Sebelumnya fungsi ini disalin identik di banyak komponen.
 *
 * Envelope validasi backend berbentuk
 *   { message: "Validasi request gagal", errors: [{ message: "..." }] }
 * sehingga pesan top-level saja tidak menjelaskan apa yang salah. Rincian field
 * ditempelkan agar pengguna tahu bagian mana yang harus diperbaiki.
 */
export function toMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const detail = error.fieldErrors
      .map((item) => item.message?.trim())
      .filter(Boolean)
      .join('; ')
    return detail ? `${error.message}: ${detail}` : error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}
