import { InvariantError } from './InvariantError';
import { NotFoundError } from './NotFoundError';
import { AuthenticationError } from './AuthenticationError';
import { AuthorizationError } from './AuthorizationError';
import { ConflictError } from './ConflictError';
import { ClientError } from './ClientError';

type ErrorMap = Record<string, ClientError>;

/**
 * Translates domain-level error codes (string keys thrown from entities/use-cases)
 * into typed ClientError instances with user-facing messages.
 *
 * Pattern mirrors sample-be DomainErrorTranslator — keeps domain layer
 * decoupled from HTTP concepts.
 */
const DomainErrorTranslator = {
  translate(error: Error): Error {
    return DomainErrorTranslator._directories[error.message] ?? error;
  },

  _directories: {
    // ── RegisterCompany ──────────────────────────────────────────
    'REGISTER_COMPANY.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat company: properti yang dibutuhkan tidak ada',
    ),
    'REGISTER_COMPANY.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat company: tipe data tidak sesuai',
    ),
    'REGISTER_COMPANY.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat company: nama company melebihi batas 100 karakter',
    ),
    'REGISTER_COMPANY.SLUG_CONTAIN_RESTRICTED_CHARACTER': new InvariantError(
      'Gagal membuat company: slug hanya boleh berisi huruf kecil, angka, dan tanda hubung',
    ),

    // ── RegisterUser ─────────────────────────────────────────────
    'REGISTER_USER.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat user: properti yang dibutuhkan tidak ada',
    ),
    'REGISTER_USER.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat user: tipe data tidak sesuai',
    ),
    'REGISTER_USER.EMAIL_LIMIT_CHAR': new InvariantError(
      'Gagal membuat user: email melebihi batas 100 karakter',
    ),
    'REGISTER_USER.INVALID_EMAIL_FORMAT': new InvariantError(
      'Gagal membuat user: format email tidak valid',
    ),
    'REGISTER_USER.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat user: nama melebihi batas 100 karakter',
    ),
    'REGISTER_USER.PASSWORD_MIN_LENGTH': new InvariantError(
      'Gagal membuat user: password minimal 8 karakter',
    ),

    // ── UserLogin ────────────────────────────────────────────────
    'USER_LOGIN.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Email dan password harus diisi',
    ),
    'USER_LOGIN.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Email dan password harus berupa string',
    ),

    // ── RefreshAuthentication ────────────────────────────────────
    'REFRESH_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN': new InvariantError(
      'Refresh token harus dikirimkan',
    ),
    'REFRESH_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Refresh token harus berupa string',
    ),

    // ── DeleteAuthentication ─────────────────────────────────────
    'DELETE_AUTHENTICATION.NOT_CONTAIN_REFRESH_TOKEN': new InvariantError(
      'Refresh token harus dikirimkan',
    ),
    'DELETE_AUTHENTICATION.PAYLOAD_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Refresh token harus berupa string',
    ),

    // ── Authentication checks ────────────────────────────────────
    'AUTHENTICATION.CREDENTIALS_NOT_VALID': new AuthenticationError(
      'Email atau password tidak valid',
    ),
    'AUTHENTICATION.TOKEN_NOT_VALID': new AuthenticationError(
      'Token tidak valid atau sudah kadaluarsa',
    ),
    'AUTHENTICATION.REFRESH_TOKEN_NOT_FOUND': new AuthenticationError(
      'Refresh token tidak ditemukan',
    ),

    // ── Authorization ────────────────────────────────────────────
    'AUTHORIZATION.ACCESS_DENIED': new AuthorizationError(
      'Anda tidak memiliki akses untuk melakukan tindakan ini',
    ),

    // ── User not found ───────────────────────────────────────────
    'USER.NOT_FOUND': new NotFoundError('User tidak ditemukan'),
    'COMPANY.NOT_FOUND': new NotFoundError('Company tidak ditemukan'),
    'ROLE.NOT_FOUND': new NotFoundError('Role tidak ditemukan'),
    'OUTLET.NOT_FOUND': new NotFoundError('Outlet tidak ditemukan'),

    // ── Conflict ─────────────────────────────────────────────────
    'USER.EMAIL_ALREADY_USED': new ConflictError(
      'Email sudah digunakan oleh akun lain',
    ),
    'COMPANY.SLUG_ALREADY_USED': new ConflictError(
      'Slug company sudah digunakan',
    ),
  } as ErrorMap,
};

export default DomainErrorTranslator;
