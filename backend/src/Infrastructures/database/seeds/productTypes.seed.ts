/**
 * Product type reference data.
 *
 * Codes are the stable identifiers stored in `products.product_type`; `name` is
 * the human-readable label exposed to the UI. Seed rows are upserted by
 * `run-seed.ts` so wording/sort order can change without a migration.
 */
export interface ProductTypeSeedRow {
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export const PRODUCT_TYPE_SEEDS: ProductTypeSeedRow[] = [
  {
    code: 'RAW_MATERIAL',
    name: 'Bahan Baku',
    description: 'Bahan yang dibeli dan diolah menjadi produk.',
    sortOrder: 10,
    isActive: true,
  },
  {
    code: 'FINISHED_GOODS',
    name: 'Barang Jadi',
    description: 'Produk jadi yang dijual atau diproduksi.',
    sortOrder: 20,
    isActive: true,
  },
  {
    code: 'SEMI_FINISHED',
    name: 'Setengah Jadi',
    description: 'Bahan setengah jadi yang dapat diproses lebih lanjut.',
    sortOrder: 30,
    isActive: true,
  },
  {
    code: 'PACKAGING',
    name: 'Kemasan',
    description: 'Kemasan eksternal seperti botol, dus, dan label.',
    sortOrder: 40,
    isActive: true,
  },
  {
    code: 'BEVERAGE',
    name: 'Minuman',
    description: 'Produk minuman yang dijual.',
    sortOrder: 50,
    isActive: true,
  },
  {
    code: 'OFFICE_SUPPLIES',
    name: 'Alat Tulis Kantor',
    description: 'Kebutuhan administrasi kantor.',
    sortOrder: 60,
    isActive: true,
  },
  {
    code: 'SPARE_PART',
    name: 'Suku Cadang',
    description: 'Suku cadang peralatan atau mesin.',
    sortOrder: 70,
    isActive: true,
  },
  {
    code: 'OPERATING_SUPPLIES',
    name: 'Bahan Habis Pakai',
    description: 'Bahan operasional habis pakai.',
    sortOrder: 80,
    isActive: true,
  },
  {
    code: 'MERCHANDISE',
    name: 'Merchandise',
    description: 'Barang dagangan non-produksi.',
    sortOrder: 90,
    isActive: true,
  },
  {
    code: 'ELECTRONIC',
    name: 'Elektronik',
    description: 'Perangkat atau perlengkapan elektronik.',
    sortOrder: 100,
    isActive: true,
  },
];
