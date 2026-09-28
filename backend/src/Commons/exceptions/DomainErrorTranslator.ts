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

    // ── CreateOutlet ─────────────────────────────────────────────
    'CREATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat outlet: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat outlet: tipe data tidak sesuai',
    ),
    'CREATE_OUTLET.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat outlet: nama harus 1-100 karakter',
    ),
    'CREATE_OUTLET.PHONE_LIMIT_CHAR': new InvariantError(
      'Gagal membuat outlet: nomor telepon maksimal 30 karakter',
    ),

    // ── UpdateOutlet ─────────────────────────────────────────────
    'UPDATE_OUTLET.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui outlet: tidak ada field yang dikirimkan',
    ),
    'UPDATE_OUTLET.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui outlet: tipe data tidak sesuai',
    ),
    'UPDATE_OUTLET.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui outlet: nama harus 1-100 karakter',
    ),
    'UPDATE_OUTLET.PHONE_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui outlet: nomor telepon maksimal 30 karakter',
    ),

    // ── Outlet ───────────────────────────────────────────────────
    'OUTLET.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data outlet tidak lengkap',
    ),

    // ── CreateProductGroup ───────────────────────────────────────
    'CREATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat product group: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_PRODUCT_GROUP.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat product group: tipe data tidak sesuai',
    ),
    'CREATE_PRODUCT_GROUP.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat product group: nama harus 1-100 karakter',
    ),
    'CREATE_PRODUCT_GROUP.DESCRIPTION_LIMIT_CHAR': new InvariantError(
      'Gagal membuat product group: deskripsi maksimal 500 karakter',
    ),

    // ── UpdateProductGroup ───────────────────────────────────────
    'UPDATE_PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui product group: tidak ada field yang dikirimkan',
    ),
    'UPDATE_PRODUCT_GROUP.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui product group: tipe data tidak sesuai',
    ),
    'UPDATE_PRODUCT_GROUP.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui product group: nama harus 1-100 karakter',
    ),
    'UPDATE_PRODUCT_GROUP.DESCRIPTION_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui product group: deskripsi maksimal 500 karakter',
    ),

    // ── ProductGroup ─────────────────────────────────────────────
    'PRODUCT_GROUP.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data product group tidak lengkap',
    ),

    // ── CreateUom ────────────────────────────────────────────────
    'CREATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat UOM: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat UOM: tipe data tidak sesuai',
    ),
    'CREATE_UOM.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat UOM: nama harus 1-100 karakter',
    ),

    // ── UpdateUom ────────────────────────────────────────────────
    'UPDATE_UOM.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui UOM: tidak ada field yang dikirimkan',
    ),
    'UPDATE_UOM.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui UOM: tipe data tidak sesuai',
    ),
    'UPDATE_UOM.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui UOM: nama harus 1-100 karakter',
    ),

    // ── Uom ──────────────────────────────────────────────────────
    'UOM.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError('Data UOM tidak lengkap'),

    // ── CreateSupplier ───────────────────────────────────────────
    'CREATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat supplier: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_SUPPLIER.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat supplier: tipe data tidak sesuai',
    ),
    'CREATE_SUPPLIER.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat supplier: nama harus 1-100 karakter',
    ),
    'CREATE_SUPPLIER.PHONE_LIMIT_CHAR': new InvariantError(
      'Gagal membuat supplier: nomor telepon maksimal 30 karakter',
    ),
    'CREATE_SUPPLIER.PIC_NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat supplier: nama PIC maksimal 100 karakter',
    ),

    // ── UpdateSupplier ───────────────────────────────────────────
    'UPDATE_SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui supplier: tidak ada field yang dikirimkan',
    ),
    'UPDATE_SUPPLIER.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui supplier: tipe data tidak sesuai',
    ),
    'UPDATE_SUPPLIER.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui supplier: nama harus 1-100 karakter',
    ),
    'UPDATE_SUPPLIER.PHONE_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui supplier: nomor telepon maksimal 30 karakter',
    ),
    'UPDATE_SUPPLIER.PIC_NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui supplier: nama PIC maksimal 100 karakter',
    ),

    // ── Supplier ─────────────────────────────────────────────────
    'SUPPLIER.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError('Data supplier tidak lengkap'),

    // ── CreateCategory ───────────────────────────────────────────
    'CREATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat kategori: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat kategori: tipe data tidak sesuai',
    ),
    'CREATE_CATEGORY.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat kategori: nama harus 1-100 karakter',
    ),
    'CREATE_CATEGORY.DESCRIPTION_LIMIT_CHAR': new InvariantError(
      'Gagal membuat kategori: deskripsi maksimal 500 karakter',
    ),
    'CREATE_CATEGORY.PRODUCT_GROUP_INACTIVE': new InvariantError(
      'Gagal membuat kategori: product group tidak aktif',
    ),

    // ── UpdateCategory ───────────────────────────────────────────
    'UPDATE_CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui kategori: tidak ada field yang dikirimkan',
    ),
    'UPDATE_CATEGORY.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui kategori: tipe data tidak sesuai',
    ),
    'UPDATE_CATEGORY.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui kategori: nama harus 1-100 karakter',
    ),
    'UPDATE_CATEGORY.DESCRIPTION_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui kategori: deskripsi maksimal 500 karakter',
    ),

    // ── ProductCategory ──────────────────────────────────────────
    'CATEGORY.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError('Data kategori tidak lengkap'),

    // ── CreateProduct ────────────────────────────────────────────
    'CREATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat produk: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat produk: tipe data tidak sesuai',
    ),
    'CREATE_PRODUCT.SKU_LIMIT_CHAR': new InvariantError(
      'Gagal membuat produk: SKU harus 1-50 karakter',
    ),
    'CREATE_PRODUCT.BARCODE_LIMIT_CHAR': new InvariantError(
      'Gagal membuat produk: barcode maksimal 50 karakter',
    ),
    'CREATE_PRODUCT.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat produk: nama harus 1-150 karakter',
    ),
    'CREATE_PRODUCT.INVALID_PRODUCT_TYPE': new InvariantError(
      'Gagal membuat produk: tipe produk tidak valid',
    ),
    'CREATE_PRODUCT.INVALID_PRICE': new InvariantError(
      'Gagal membuat produk: harga dan stok harus angka tidak negatif',
    ),
    'CREATE_PRODUCT.INVALID_SHELF_LIFE': new InvariantError(
      'Gagal membuat produk: masa simpan harus bilangan bulat tidak negatif',
    ),
    'CREATE_PRODUCT.PRODUCT_GROUP_INACTIVE': new InvariantError(
      'Gagal membuat produk: product group tidak aktif',
    ),
    'CREATE_PRODUCT.CATEGORY_INACTIVE': new InvariantError(
      'Gagal membuat produk: kategori tidak aktif',
    ),
    'CREATE_PRODUCT.CATEGORY_GROUP_MISMATCH': new InvariantError(
      'Gagal membuat produk: kategori tidak termasuk dalam product group yang dipilih',
    ),
    'CREATE_PRODUCT.UOM_INACTIVE': new InvariantError(
      'Gagal membuat produk: satuan (UOM) tidak aktif',
    ),
    'CREATE_PRODUCT.SUPPLIER_INACTIVE': new InvariantError(
      'Gagal membuat produk: supplier tidak aktif',
    ),

    // ── UpdateProduct ────────────────────────────────────────────
    'UPDATE_PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui produk: tidak ada field yang dikirimkan',
    ),
    'UPDATE_PRODUCT.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui produk: tipe data tidak sesuai',
    ),
    'UPDATE_PRODUCT.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui produk: nama harus 1-150 karakter',
    ),
    'UPDATE_PRODUCT.BARCODE_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui produk: barcode maksimal 50 karakter',
    ),
    'UPDATE_PRODUCT.INVALID_PRODUCT_TYPE': new InvariantError(
      'Gagal memperbarui produk: tipe produk tidak valid',
    ),
    'UPDATE_PRODUCT.INVALID_PRICE': new InvariantError(
      'Gagal memperbarui produk: harga dan stok harus angka tidak negatif',
    ),
    'UPDATE_PRODUCT.INVALID_SHELF_LIFE': new InvariantError(
      'Gagal memperbarui produk: masa simpan harus bilangan bulat tidak negatif',
    ),

    // ── Product ──────────────────────────────────────────────────
    'PRODUCT.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError('Data produk tidak lengkap'),

    // ── CreateUser / UpdateUser ──────────────────────────────────
    'CREATE_USER.ROLE_REQUIRED': new InvariantError(
      'Gagal membuat user: role wajib dipilih',
    ),
    'UPDATE_USER.ROLE_INVALID': new InvariantError(
      'Gagal memperbarui user: role tidak valid',
    ),
    'UPDATE_USER.OUTLETS_INVALID': new InvariantError(
      'Gagal memperbarui user: daftar outlet tidak valid',
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
    'AUTHORIZATION.NO_COMPANY_CONTEXT': new AuthorizationError(
      'Akun Anda tidak terhubung ke perusahaan manapun',
    ),

    // ── User not found ───────────────────────────────────────────
    'USER.NOT_FOUND': new NotFoundError('User tidak ditemukan'),
    'COMPANY.NOT_FOUND': new NotFoundError('Company tidak ditemukan'),
    'ROLE.NOT_FOUND': new NotFoundError('Role tidak ditemukan'),
    'OUTLET.NOT_FOUND': new NotFoundError('Outlet tidak ditemukan'),
    'PRODUCT_GROUP.NOT_FOUND': new NotFoundError('Product group tidak ditemukan'),
    'UOM.NOT_FOUND': new NotFoundError('UOM tidak ditemukan'),
    'SUPPLIER.NOT_FOUND': new NotFoundError('Supplier tidak ditemukan'),
    'CATEGORY.NOT_FOUND': new NotFoundError('Kategori tidak ditemukan'),
    'PRODUCT.NOT_FOUND': new NotFoundError('Produk tidak ditemukan'),
    'INVENTORY_BATCH.NOT_FOUND': new NotFoundError('Batch inventory tidak ditemukan'),

    // ── Inventory (validation & business rules) ──────────────────
    'INVENTORY.INVALID_MOVEMENT_TYPE': new InvariantError('Tipe pergerakan stok tidak valid'),
    'INVENTORY.INVALID_BATCH_STATUS': new InvariantError('Status batch tidak valid'),
    'INVENTORY.INSUFFICIENT_STOCK': new InvariantError(
      'Stok tidak mencukupi untuk memenuhi jumlah yang diminta',
    ),
    'INVENTORY.DUPLICATE_MOVEMENT_SOURCE': new ConflictError(
      'Pergerakan stok untuk dokumen sumber ini sudah pernah diposting',
    ),
    'INVENTORY_BATCH.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data batch inventory tidak lengkap',
    ),
    'FEFO.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Alokasi FEFO membutuhkan outletId dan productId',
    ),
    'FEFO.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah alokasi FEFO harus berupa angka',
    ),
    'FEFO.QTY_MUST_BE_POSITIVE': new InvariantError('Jumlah alokasi FEFO harus lebih dari nol'),

    // ── Stock Adjustment ─────────────────────────────────────────
    'STOCK_ADJUSTMENT.NOT_FOUND': new NotFoundError('Stock adjustment tidak ditemukan'),
    'CREATE_STOCK_ADJUSTMENT.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data stock adjustment tidak lengkap',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEMS_REQUIRED': new InvariantError(
      'Stock adjustment harus memiliki minimal satu item',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Format item stock adjustment tidak valid',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEM_BATCH_REQUIRED': new InvariantError(
      'Setiap item stock adjustment harus menyertakan batch',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEM_PRODUCT_REQUIRED': new InvariantError(
      'Setiap item stock adjustment harus menyertakan produk',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_DIRECTION': new InvariantError(
      'Arah adjustment harus IN atau OUT',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah item stock adjustment harus berupa angka',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEM_QTY_MUST_BE_POSITIVE': new InvariantError(
      'Jumlah item stock adjustment harus lebih dari nol',
    ),
    'CREATE_STOCK_ADJUSTMENT.ITEM_INVALID_REASON': new InvariantError(
      'Alasan adjustment tidak valid',
    ),
    'CREATE_STOCK_ADJUSTMENT.BATCH_OUTLET_MISMATCH': new InvariantError(
      'Batch tidak berada pada outlet yang dipilih',
    ),
    'CREATE_STOCK_ADJUSTMENT.BATCH_PRODUCT_MISMATCH': new InvariantError(
      'Batch tidak sesuai dengan produk yang dipilih',
    ),
    'STOCK_ADJUSTMENT.ONLY_DRAFT_EDITABLE': new InvariantError(
      'Hanya stock adjustment berstatus DRAFT yang dapat diubah',
    ),
    'STOCK_ADJUSTMENT.INVALID_STATUS_TRANSITION': new InvariantError(
      'Transisi status stock adjustment tidak diperbolehkan',
    ),
    'STOCK_ADJUSTMENT.INVALID_STATUS': new InvariantError('Status stock adjustment tidak valid'),

    // ── Stock Transfer ───────────────────────────────────────────
    'STOCK_TRANSFER.NOT_FOUND': new NotFoundError('Stock transfer tidak ditemukan'),
    'CREATE_STOCK_TRANSFER.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data stock transfer tidak lengkap',
    ),
    'CREATE_STOCK_TRANSFER.SAME_OUTLET': new InvariantError(
      'Outlet asal dan tujuan tidak boleh sama',
    ),
    'CREATE_STOCK_TRANSFER.ITEMS_REQUIRED': new InvariantError(
      'Stock transfer harus memiliki minimal satu item',
    ),
    'CREATE_STOCK_TRANSFER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Format item stock transfer tidak valid',
    ),
    'CREATE_STOCK_TRANSFER.ITEM_BATCH_REQUIRED': new InvariantError(
      'Setiap item stock transfer harus menyertakan batch sumber',
    ),
    'CREATE_STOCK_TRANSFER.ITEM_PRODUCT_REQUIRED': new InvariantError(
      'Setiap item stock transfer harus menyertakan produk',
    ),
    'CREATE_STOCK_TRANSFER.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah item stock transfer harus berupa angka',
    ),
    'CREATE_STOCK_TRANSFER.ITEM_QTY_MUST_BE_POSITIVE': new InvariantError(
      'Jumlah item stock transfer harus lebih dari nol',
    ),
    'CREATE_STOCK_TRANSFER.BATCH_OUTLET_MISMATCH': new InvariantError(
      'Batch sumber tidak berada pada outlet asal',
    ),
    'CREATE_STOCK_TRANSFER.BATCH_PRODUCT_MISMATCH': new InvariantError(
      'Batch sumber tidak sesuai dengan produk yang dipilih',
    ),
    'STOCK_TRANSFER.ONLY_DRAFT_EDITABLE': new InvariantError(
      'Hanya stock transfer berstatus DRAFT yang dapat diubah',
    ),
    'STOCK_TRANSFER.INVALID_STATUS_TRANSITION': new InvariantError(
      'Transisi status stock transfer tidak diperbolehkan',
    ),
    'STOCK_TRANSFER.INVALID_STATUS': new InvariantError('Status stock transfer tidak valid'),

    // ── Conflict ─────────────────────────────────────────────────
    'USER.EMAIL_ALREADY_USED': new ConflictError(
      'Email sudah digunakan oleh akun lain',
    ),
    'COMPANY.SLUG_ALREADY_USED': new ConflictError(
      'Slug company sudah digunakan',
    ),
    'PRODUCT_GROUP.IN_USE': new ConflictError(
      'Product group tidak dapat dihapus atau dinonaktifkan karena masih digunakan oleh kategori atau produk aktif',
    ),
    'UOM.IN_USE': new ConflictError(
      'UOM tidak dapat dihapus atau dinonaktifkan karena masih digunakan oleh produk aktif',
    ),
    'SUPPLIER.IN_USE': new ConflictError(
      'Supplier tidak dapat dihapus atau dinonaktifkan karena masih digunakan oleh produk aktif',
    ),
    'CATEGORY.IN_USE': new ConflictError(
      'Kategori tidak dapat dihapus atau dinonaktifkan karena masih digunakan oleh produk aktif',
    ),
    'PRODUCT.SKU_ALREADY_USED': new ConflictError('SKU sudah digunakan oleh produk lain'),
    'PRODUCT.BARCODE_ALREADY_USED': new ConflictError(
      'Barcode sudah digunakan oleh produk lain',
    ),
  } as ErrorMap,
};

export default DomainErrorTranslator;
