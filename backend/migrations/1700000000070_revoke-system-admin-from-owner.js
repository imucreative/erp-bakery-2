/**
 * Migration 070: Revoke system administration permissions from OWNER role
 * 
 * ISSUE-01: Owner seharusnya tidak memiliki akses ke Users & Roles management.
 * Hanya SUPER_ADMIN yang boleh mengelola system administration.
 * 
 * This migration revokes 8 system-administration permissions from all existing
 * OWNER roles across all companies:
 * - user.read, user.manage
 * - role.read, role.manage
 * - permission.read, permission.manage
 * - audit.read, auth.manage
 * 
 * Note: This is an irreversible migration. If restoration is needed, it must
 * be done manually per company.
 */

exports.up = (pgm) => {
  pgm.sql(`
    -- Revoke system administration permissions from OWNER role
    DELETE FROM role_permissions
    WHERE role_id IN (
      SELECT id FROM roles WHERE code = 'OWNER'
    )
    AND permission_id IN (
      SELECT id FROM permissions
      WHERE code IN (
        'user.read', 'user.manage',
        'role.read', 'role.manage',
        'permission.read', 'permission.manage',
        'audit.read', 'auth.manage'
      )
    );
  `);
};

exports.down = (pgm) => {
  // Irreversible migration — cannot reliably restore which companies had OWNER
  // with these permissions. Mark as no-op to acknowledge this.
  pgm.sql(`SELECT 1`);
};
