// Migration: update product_type check constraint to include BEVERAGE
exports.up = (pgm) => {
    // Drop the old constraint
    pgm.dropConstraint('products', 'products_product_type_check');
    // Add the new constraint with BEVERAGE
    pgm.addConstraint(
        'products',
        'products_product_type_check',
        "CHECK (product_type IN ('RAW_MATERIAL','FINISHED_GOODS','SEMI_FINISHED','PACKAGING','BEVERAGE'))",
    );
};

exports.down = (pgm) => {
    // Revert to original constraint without BEVERAGE
    pgm.dropConstraint('products', 'products_product_type_check');
    pgm.addConstraint(
        'products',
        'products_product_type_check',
        "CHECK (product_type IN ('RAW_MATERIAL','FINISHED_GOODS','SEMI_FINISHED','PACKAGING'))",
    );
};
