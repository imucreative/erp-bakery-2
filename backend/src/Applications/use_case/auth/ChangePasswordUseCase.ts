import { UserRepository } from '../../../Domains/users/UserRepository';
import { AuthenticationRepository } from '../../../Domains/authentications/AuthenticationRepository';
import { PasswordHash } from '../../security/PasswordHash';
import { AuthenticationError } from '../../../Commons/exceptions/AuthenticationError';

/**
 * UseCase: ChangePasswordUseCase
 *
 * Ganti password milik user yang sedang login. Wajib menyertakan password lama
 * sebagai bukti kepemilikan akun.
 *
 * Setelah password diganti, seluruh refresh token user dicabut **kecuali** token
 * sesi yang sedang dipakai (`keepRefreshToken`), sehingga:
 *  - sesi penyerang / perangkat lain langsung mati, dan
 *  - pengguna yang mengganti password tidak terlempar keluar.
 * Bila `keepRefreshToken` tidak dikirim, semua sesi dicabut.
 */
export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly passwordHash: PasswordHash,
  ) {}

  async execute(payload: {
    userId: string;
    currentPassword: string;
    newPassword: string;
    keepRefreshToken: string | null;
  }): Promise<void> {
    const currentHash = await this.userRepository.getPasswordById(payload.userId);

    try {
      await this.passwordHash.comparePassword(payload.currentPassword, currentHash);
    } catch {
      // Kode ini memang dipakai untuk kredensial yang tidak cocok (401).
      throw new AuthenticationError('AUTHENTICATION.CREDENTIALS_NOT_VALID');
    }

    const newHash = await this.passwordHash.hash(payload.newPassword);
    await this.userRepository.updatePassword(payload.userId, newHash);

    if (payload.keepRefreshToken) {
      await this.authenticationRepository.deleteTokensByUserIdExcept(
        payload.userId,
        payload.keepRefreshToken,
      );
      return;
    }

    await this.authenticationRepository.deleteTokensByUserId(payload.userId);
  }
}
