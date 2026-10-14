/* eslint-disable camelcase */

/**
 * Grant the read-only UOM permission to existing default cashier roles.
 *
 * Product readers need UOM labels to interpret a product's base unit, while
 * this does not grant permission to create or modify units.
 */
exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    JOIN permissions p ON p.code = 'uom.read'
    WHERE r.code = 'KASIR'
      AND r.company_id IS NOT NULL
    ON CONFLICT (role_id, permission_id) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM role_permissions rp
    USING roles r, permissions p
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
      AND r.code = 'KASIR'
      AND r.company_id IS NOT NULL
      AND p.code = 'uom.read'
  `);
};
