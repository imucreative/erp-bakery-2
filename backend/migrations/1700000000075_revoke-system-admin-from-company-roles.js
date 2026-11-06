/**
 * Migration 075: Revoke system-administration permissions from company roles
 *
 * Doc 16 reserves the 8 system-administration permissions for SUPER_ADMIN.
 * Migration 070 revoked them from OWNER roles only; this migration closes the
 * remaining gap for any other company-scoped role that still holds them.
 *
 * Irreversible: the original per-role grants cannot be reconstructed.
 */

exports.up = (pgm) => {
  pgm.sql(`
    DELETE FROM role_permissions rp
    USING roles r, permissions p
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND r.company_id IS NOT NULL
      AND p.code IN (
        'user.read', 'user.manage',
        'role.read', 'role.manage',
        'permission.read', 'permission.manage',
        'audit.read', 'auth.manage'
      );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`SELECT 1`);
};
