/* eslint-disable camelcase */

/**
 * Migration: recipe_items (BOM ingredients)
 *
 * Each line is a required ingredient product with a base quantity and an
 * optional loss/wastage allowance percentage (production-domain §3).
 * Effective consumption when scaled = qty * scale * (1 + loss_percentage/100).
 */
exports.up = (pgm) => {
  pgm.createTable('recipe_items', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    recipe_id: {
      type: 'UUID',
      notNull: true,
      references: '"recipes"',
      onDelete: 'CASCADE',
    },
    ingredient_product_id: {
      type: 'UUID',
      notNull: true,
      references: '"products"',
      onDelete: 'RESTRICT',
    },
    qty: {
      type: 'NUMERIC(18,3)',
      notNull: true,
      comment: 'Base quantity per one recipe batch (before scaling/loss)',
    },
    uom_id: {
      type: 'UUID',
      notNull: true,
      references: '"uoms"',
      onDelete: 'RESTRICT',
    },
    loss_percentage: {
      type: 'NUMERIC(6,3)',
      notNull: true,
      default: 0,
      comment: 'Wastage allowance %, 0..100',
    },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint('recipe_items', 'recipe_items_qty_positive', 'CHECK (qty > 0)');
  pgm.addConstraint(
    'recipe_items',
    'recipe_items_loss_range',
    'CHECK (loss_percentage >= 0 AND loss_percentage <= 100)',
  );
  // An ingredient appears at most once per recipe
  pgm.addConstraint(
    'recipe_items',
    'recipe_items_recipe_ingredient_unique',
    'UNIQUE (recipe_id, ingredient_product_id)',
  );

  pgm.createIndex('recipe_items', 'recipe_id');
  pgm.createIndex('recipe_items', 'ingredient_product_id');
};

exports.down = (pgm) => {
  pgm.dropTable('recipe_items');
};
