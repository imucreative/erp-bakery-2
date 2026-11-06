import { RegisterUser } from './entities/RegisterUser';
import { RegisteredUser } from './entities/RegisteredUser';

export interface UserRecord {
  id: string;
  companyId: string | null;
  roleId: string | null;
  name: string;
  email: string;
  phone: string | null;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPermissions extends UserRecord {
  permissions: string[];
  roleCode: string | null;
}

export interface UserListFilter {
  limit: number;
  offset: number;
  search?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface UserOutletRef {
  outletId: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface UserDetail extends UserRecord {
  roleCode: string | null;
  roleName: string | null;
  outlets: UserOutletRef[];
}

export interface UpdateUserFields {
  name?: string;
  phone?: string | null;
  roleId?: string | null;
  isActive?: boolean;
}

/** 2FA (TOTP) state for a user. */
export interface TwoFactorState {
  id: string;
  email: string;
  isSuperAdmin: boolean;
  enabled: boolean;
  /** AES-GCM payload of the Base32 secret; null when enrollment has not started. */
  secretCipher: string | null;
  /** bcrypt hashes of single-use recovery codes. */
  recoveryCodeHashes: string[];
}

/** Self-service profile of the authenticated user. */
export interface MyProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  roleCode: string | null;
  roleName: string | null;
  companyId: string | null;
  companyName: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Fields a user may change on their own profile. */
export interface UpdateMyProfileFields {
  name?: string;
  phone?: string | null;
  jobTitle?: string | null;
  avatarUrl?: string | null;
}

/** One-time password reset token (only its hash is persisted). */
export interface PasswordResetToken {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

/** Minimal user identity needed by the "forgot password" flow. */
export interface PasswordResetUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Abstract repository interface — Users domain.
 */
export abstract class UserRepository {
  /**
   * Persist a new user and return the created record (no password).
   */
  abstract addUser(
    data: RegisterUser,
    companyId: string | null,
    roleId: string | null,
  ): Promise<RegisteredUser>;

  /**
   * Check email uniqueness. Throws USER.EMAIL_ALREADY_USED if taken.
   */
  abstract verifyAvailableEmail(email: string): Promise<void>;

  /**
   * Fetch hashed password by email.
   * Throws AUTHENTICATION.CREDENTIALS_NOT_VALID if not found.
   */
  abstract getPasswordByEmail(email: string): Promise<string>;

  /**
   * Fetch full user record + permissions array for JWT payload.
   * Throws AUTHENTICATION.CREDENTIALS_NOT_VALID if not found or inactive.
   */
  abstract getUserWithPermissionsByEmail(email: string): Promise<UserWithPermissions>;

  /**
   * Fetch full user record + permissions by user ID.
   * Throws USER.NOT_FOUND if not found or deleted.
   */
  abstract getUserWithPermissionsById(id: string): Promise<UserWithPermissions>;

  /**
   * Fetch user by id (basic, no permissions join).
   * Throws USER.NOT_FOUND if not found.
   */
  abstract getUserById(id: string): Promise<UserRecord>;

  // ── User management (tenant-scoped) ────────────────────────────────

  /** List users for a company with pagination + optional filters. */
  abstract getUsersByCompany(
    companyId: string,
    filter: UserListFilter,
  ): Promise<{ rows: UserRecord[]; total: number }>;

  /** Fetch a user with role + assigned outlets, scoped to a company. Throws USER.NOT_FOUND. */
  abstract getUserDetail(id: string, companyId: string): Promise<UserDetail>;

  /** Update mutable user fields scoped to a company. Throws USER.NOT_FOUND. */
  abstract updateUser(
    id: string,
    companyId: string,
    fields: UpdateUserFields,
  ): Promise<UserRecord>;

  /** Soft-delete a user scoped to a company. Throws USER.NOT_FOUND. */
  abstract softDeleteUser(id: string, companyId: string): Promise<void>;

  /** Replace a user's outlet assignments (idempotent full-sync). */
  abstract setUserOutlets(userId: string, outletIds: string[]): Promise<void>;

  // ── Two-factor authentication (TOTP) ────────────────────────────────

  /** Fetch 2FA state by email. Throws AUTHENTICATION.CREDENTIALS_NOT_VALID. */
  abstract getTwoFactorStateByEmail(email: string): Promise<TwoFactorState>;

  /** Fetch 2FA state by user id. Throws USER.NOT_FOUND. */
  abstract getTwoFactorStateById(id: string): Promise<TwoFactorState>;

  /** Persist a pending enrollment (secret + recovery codes); 2FA stays disabled. */
  abstract saveTwoFactorSetup(
    id: string,
    secretCipher: string,
    recoveryCodeHashes: string[],
  ): Promise<void>;

  /** Replace the stored recovery code hashes (used when one is consumed). */
  abstract updateRecoveryCodes(id: string, recoveryCodeHashes: string[]): Promise<void>;

  /** Enable 2FA, or disable it and wipe the secret + recovery codes. */
  abstract setTwoFactorEnabled(id: string, enabled: boolean): Promise<void>;

  // ── Self-service profile ────────────────────────────────────────────

  /** Profile of the authenticated user (with role + company names). Throws USER.NOT_FOUND. */
  abstract getMyProfile(id: string): Promise<MyProfile>;

  /** Update the authenticated user's own fields. Throws USER.NOT_FOUND. */
  abstract updateMyProfile(id: string, fields: UpdateMyProfileFields): Promise<MyProfile>;

  /** Record a successful login timestamp. */
  abstract touchLastLogin(id: string): Promise<void>;

  // ── Password reset ("lupa password") ────────────────────────────────

  /**
   * Look up an active user by email for the reset flow.
   * Returns null (not a throw) so the endpoint can stay enumeration-safe.
   */
  abstract findActiveUserByEmail(email: string): Promise<PasswordResetUser | null>;

  /**
   * Persist a reset token hash and invalidate the user's previous unused tokens.
   */
  abstract createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    requestedIp: string | null,
  ): Promise<void>;

  /** Fetch a token that is unused and not expired. Null when unusable. */
  abstract getUsablePasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null>;

  /** Mark a token as consumed (single-use). */
  abstract markPasswordResetTokenUsed(id: string): Promise<void>;

  /** Store a new password hash for the user. Throws USER.NOT_FOUND. */
  abstract updatePassword(id: string, passwordHash: string): Promise<void>;

  /** Current password hash of the user (untuk verifikasi password lama). */
  abstract getPasswordById(id: string): Promise<string>;
}
