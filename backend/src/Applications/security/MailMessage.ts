/**
 * Satu email yang akan dikirim lewat MailSender.
 *
 * Sengaja sederhana (tanpa template engine): subjek + isi teks. Bila nanti perlu
 * HTML, cukup isi `html`; subjek dan teks tetap wajib.
 */
export interface MailMessage {
  /** Alamat tujuan, mis. `user@perusahaan.com`. */
  to: string;
  /** Subjek email. */
  subject: string;
  /** Isi versi teks biasa — selalu diisi (fallback semua klien email). */
  text: string;
  /** Isi versi HTML — opsional. */
  html?: string;
}
