import { MailMessage } from './MailMessage';

/**
 * Abstract notification interface: MailSender
 *
 * Implementasi konkret:
 *  - ConsoleMailSender (Infrastructures/mail/) — menulis ke log server; dipakai
 *    selama email belum dikonfigurasi (pilot internal).
 *  - SMTP/API sender (menyusul) — cukup mengganti provider di InfrastructureModule.
 *
 * Semua pengiriman email aplikasi harus lewat abstraksi ini supaya penggantian
 * penyedia tidak menyentuh use case.
 */
export abstract class MailSender {
  /**
   * Kirim satu email. Implementasi tidak boleh melempar error ke pemanggil untuk
   * kegagalan pengiriman biasa (mis. provider down) — cukup dicatat; alur bisnis
   * seperti "lupa password" tetap harus memberi respons netral ke pengguna.
   */
  abstract send(message: MailMessage): Promise<void>;
}
