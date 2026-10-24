/**
 * Migration 071: Add dashboard & reports permissions
 *
 * Menambahkan permission baru untuk Dashboard dan Reports module,
 * lalu grant ke role OWNER dan SUPER_ADMIN.
 */

exports.up = (pgm) => {
  // Insert new permissions
  pgm.sql(`
    INSERT INTO permissions (code, name, domain, module_key, module_name, action, sort_order) VALUES
      ('dashboard.read', 'View Dashboard', 'reporting', 'dashboard', 'Dashboard', 'read', 800),
      ('reports.read', 'View Reports', 'reporting', 'report', 'Report', 'read', 810)
    ON CONFLICT (code) DO NOTHING;
  `);

  // Grant to OWNER role (explicit permissions list)
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.code = 'OWNER'
      AND p.code IN ('dashboard.read', 'reports.read')
    ON CONFLICT DO NOTHING;
  `);

  // Grant to SUPER_ADMIN role (has ALL permissions via seed)
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.code = 'SUPER_ADMIN'
      AND p.code IN ('dashboard.read', 'reports.read')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  // Revoke from roles
  pgm.sql(`
    DELETE FROM role_permissions
    WHERE permission_id IN (
      SELECT id FROM permissions WHERE code IN ('dashboard.read', 'reports.read')
    );
  `);

  // Delete permissions
  pgm.sql(`
    DELETE FROM permissions WHERE code IN ('dashboard.read', 'reports.read');
  `);
};
