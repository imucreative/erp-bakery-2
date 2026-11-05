import { MailSender } from '../../Applications/security/MailSender';
import { MailMessage } from '../../Applications/security/MailMessage';

/**
 * ConsoleMailSender
 *
 * Implementasi default selama email belum dikonfigurasi: menulis email ke log
 * server, tidak mengirim apa pun. Dipakai untuk pilot internal — link reset
 * password bisa dibaca dari log oleh admin, dan tidak ada kredensial SMTP yang
 * perlu disiapkan.
 *
 * Mengganti ke SMTP/API asli cukup dengan menambah implementasi MailSender baru
 * dan mengubah provider di InfrastructureModule; use case tidak perlu diubah.
 */
export class ConsoleMailSender extends MailSender {
  async send(message: MailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.info(`[mail] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}
