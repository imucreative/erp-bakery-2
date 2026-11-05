/**
 * Kebijakan password untuk password yang dibuat sendiri oleh pengguna
 * (Ganti Password & Reset Password).
 *
 * Backend menegakkan aturan yang sama lewat `@Matches` pada DTO, jadi fungsi di sini
 * hanya untuk memberi umpan balik lebih awal di UI — bukan pengganti validasi server.
 */
export const PASSWORD_MIN_LENGTH = 8

/** Teks bantuan yang ditampilkan di bawah field password. */
export const PASSWORD_POLICY_HINT =
  'Minimal 8 karakter, mengandung angka dan simbol (contoh: Tepung#2026).'

/**
 * Pesan kesalahan pertama yang melanggar kebijakan, atau `null` bila password
 * memenuhi syarat. Nilai kosong dianggap belum diisi (tanpa pesan) supaya pengguna
 * tidak langsung melihat error sebelum mengetik.
 */
export function passwordPolicyError(value: string): string | null {
  if (!value) {
    return null
  }
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Minimal ${PASSWORD_MIN_LENGTH} karakter`
  }
  if (!/\d/.test(value)) {
    return 'Harus mengandung minimal 1 angka'
  }
  if (!/[^A-Za-z0-9\s]/.test(value)) {
    return 'Harus mengandung minimal 1 simbol'
  }
  return null
}

/** Apakah password memenuhi seluruh kebijakan (dipakai untuk mengaktifkan tombol). */
export function isPasswordValid(value: string): boolean {
  return passwordPolicyError(value) === null && value.length >= PASSWORD_MIN_LENGTH
}
