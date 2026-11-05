import { createHash, randomBytes } from 'crypto';
import { UserRepository } from '../../../Domains/users/UserRepository';
import { AuthenticationRepository } from '../../../Domains/authentications/AuthenticationRepository';
import { PasswordHash } from '../../security/PasswordHash';
import { MailSender } from '../../security/MailSender';
import { AuthenticationError } from '../../../Commons/exceptions/AuthenticationError';

/** Masa berlaku token reset (menit). */
export const RESET_TOKEN_TTL_MINUTES = 60;

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5174';
const RESET_PATH = '/reset-password';

/**
 * Token mentah tidak pernah disimpan — hanya hash SHA-256-nya.
 * Token acak 32 byte (256 bit) jadi SHA-256 tanpa salt sudah cukup untuk
 * mencegahnya ditebak; berbeda dengan password yang butuh bcrypt.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildResetLink(token: string): string {
  return `${FRONTEND_URL.replace(/\/$/, '')}${RESET_PATH}?token=${encodeURIComponent(token)}`;
}

/**
 * UseCase: RequestPasswordResetUseCase
 *
 * Membuat token reset sekali pakai untuk email yang terdaftar, lalu
 * mengirimkannya lewat MailSender.
 *
 * Penting: use case ini **tidak pernah** memberi tahu pemanggil apakah email
 * terdaftar atau tidak (mencegah enumerasi akun). `resetLink` hanya diisi bila
 * pemanggil memintanya secara eksplisit (`exposeLink`), yang di controller
 * digerbangi env dan hanya untuk lingkungan non-produksi/pilot.
 */
export class RequestPasswordResetUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly mailSender: MailSender,
  ) {}

  async execute(payload: {
    email: string;
    requestedIp: string | null;
    exposeLink: boolean;
  }): Promise<{ resetLink: string | null }> {
    const user = await this.userRepository.findActiveUserByEmail(payload.email.trim());
    if (!user) {
      return { resetLink: null };
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    await this.userRepository.createPasswordResetToken(
      user.id,
      hashToken(token),
      expiresAt,
      payload.requestedIp,
    );

    const resetLink = buildResetLink(token);

    await this.mailSender.send({
      to: user.email,
      subject: 'Reset password akun Bakery ERP',
      text: [
        `Halo ${user.name},`,
        '',
        'Kami menerima permintaan reset password untuk akun ini.',
        `Buka tautan berikut (berlaku ${RESET_TOKEN_TTL_MINUTES} menit, sekali pakai):`,
        resetLink,
        '',
        'Abaikan email ini bila Anda tidak meminta reset password.',
      ].join('\n'),
    });

    return { resetLink: payload.exposeLink ? resetLink : null };
  }
}

/**
 * UseCase: ResetPasswordUseCase
 *
 * Menukar token reset yang masih valid dengan password baru.
 * Setelah berhasil: token ditandai terpakai dan **semua refresh token user
 * dihapus**, sehingga sesi lama tidak dapat dilanjutkan.
 */
export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordHash: PasswordHash,
  ) {}

  async execute(payload: { token: string; password: string }): Promise<void> {
    const record = await this.userRepository.getUsablePasswordResetToken(
      hashToken(payload.token.trim()),
    );

    if (!record) {
      throw new AuthenticationError('AUTHENTICATION.RESET_TOKEN_INVALID');
    }

    const password = await this.passwordHash.hash(payload.password);

    await this.userRepository.updatePassword(record.userId, password);
    await this.userRepository.markPasswordResetTokenUsed(record.id);
    await this.authenticationRepository.deleteTokensByUserId(record.userId);
  }
}
