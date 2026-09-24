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
}
