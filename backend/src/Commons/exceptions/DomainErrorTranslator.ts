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

    // ── Supplier default payment term ────────────────────────────
    'SUPPLIER.PAYMENT_TERM_NOT_FOUND': new NotFoundError(
      'Payment term default tidak ditemukan pada perusahaan ini',
    ),
    'SUPPLIER.PAYMENT_TERM_INACTIVE': new InvariantError(
      'Gagal menyimpan supplier: payment term default tidak aktif',
    ),

    // ── CreatePaymentTerm ────────────────────────────────────────
    'CREATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat payment term: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat payment term: tipe data tidak sesuai',
    ),
    'CREATE_PAYMENT_TERM.CODE_LIMIT_CHAR': new InvariantError(
      'Gagal membuat payment term: kode harus 1-20 karakter',
    ),
    'CREATE_PAYMENT_TERM.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat payment term: nama harus 1-100 karakter',
    ),
    'CREATE_PAYMENT_TERM.DUE_DAYS_INVALID': new InvariantError(
      'Gagal membuat payment term: due days harus berupa bilangan bulat >= 0',
    ),

    // ── UpdatePaymentTerm ────────────────────────────────────────
    'UPDATE_PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui payment term: tidak ada field yang dikirimkan',
    ),
    'UPDATE_PAYMENT_TERM.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui payment term: tipe data tidak sesuai',
    ),
    'UPDATE_PAYMENT_TERM.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui payment term: nama harus 1-100 karakter',
    ),
    'UPDATE_PAYMENT_TERM.DUE_DAYS_INVALID': new InvariantError(
      'Gagal memperbarui payment term: due days harus berupa bilangan bulat >= 0',
    ),

    // ── PaymentTerm ──────────────────────────────────────────────
    'PAYMENT_TERM.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data payment term tidak lengkap',
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

    // ── CreateRole ───────────────────────────────────────────────
    'CREATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal membuat role: properti yang dibutuhkan tidak ada',
    ),
    'CREATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal membuat role: tipe data tidak sesuai',
    ),
    'CREATE_ROLE.CODE_LIMIT_CHAR': new InvariantError(
      'Gagal membuat role: kode harus 1-50 karakter',
    ),
    'CREATE_ROLE.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal membuat role: nama harus 1-100 karakter',
    ),

    // ── UpdateRole ───────────────────────────────────────────────
    'UPDATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Gagal memperbarui role: tidak ada field yang dikirimkan',
    ),
    'UPDATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Gagal memperbarui role: tipe data tidak sesuai',
    ),
    'UPDATE_ROLE.NAME_LIMIT_CHAR': new InvariantError(
      'Gagal memperbarui role: nama harus 1-100 karakter',
    ),

    // ── Role (business rules & guardrails — ADR 49) ──────────────
    'ROLE.PERMISSION_UNKNOWN': new InvariantError(
      'Gagal menyimpan role: terdapat permission yang tidak dikenal',
    ),
    'ROLE.OWNER_CANNOT_BE_DELETED': new ConflictError(
      'Role Owner tidak dapat dihapus',
    ),
    'ROLE.IN_USE': new ConflictError(
      'Role tidak dapat dihapus karena masih digunakan oleh user aktif',
    ),
    'ROLE.CODE_ALREADY_USED': new ConflictError(
      'Kode role sudah digunakan pada perusahaan ini',
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
    'PAYMENT_TERM.NOT_FOUND': new NotFoundError('Payment term tidak ditemukan'),
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

    // ── Stock Opname ─────────────────────────────────────────────
    'STOCK_OPNAME.NOT_FOUND': new NotFoundError('Stock opname tidak ditemukan'),
    'STOCK_OPNAME.ITEM_NOT_FOUND': new NotFoundError('Item stock opname tidak ditemukan'),
    'CREATE_STOCK_OPNAME.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data stock opname tidak lengkap',
    ),
    'RECORD_COUNT.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data hitungan tidak lengkap',
    ),
    'RECORD_COUNT.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah hitungan harus berupa angka',
    ),
    'RECORD_COUNT.QTY_MUST_BE_NON_NEGATIVE': new InvariantError(
      'Jumlah hitungan tidak boleh negatif',
    ),
    'STOCK_OPNAME.INVALID_STATUS_TRANSITION': new InvariantError(
      'Transisi status stock opname tidak diperbolehkan',
    ),
    'STOCK_OPNAME.INVALID_STATUS': new InvariantError('Status stock opname tidak valid'),
    'STOCK_OPNAME.NOT_COUNTING': new InvariantError(
      'Hitungan hanya dapat direkam saat stock opname berstatus COUNTING',
    ),
    'STOCK_OPNAME.OUTLET_LOCKED': new ConflictError(
      'Outlet sedang dikunci oleh stock opname lain yang masih berjalan',
    ),

    // ── Recipe (BOM) ─────────────────────────────────────────────
    'RECIPE.NOT_FOUND': new NotFoundError('Recipe tidak ditemukan'),
    'RECIPE.NO_ACTIVE_RECIPE': new NotFoundError('Tidak ada recipe aktif untuk produk ini'),
    'CREATE_RECIPE.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data recipe tidak lengkap',
    ),
    'CREATE_RECIPE.YIELD_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Yield recipe harus berupa angka',
    ),
    'CREATE_RECIPE.YIELD_MUST_BE_POSITIVE': new InvariantError(
      'Yield recipe harus lebih dari nol',
    ),
    'CREATE_RECIPE.ITEMS_REQUIRED': new InvariantError(
      'Recipe harus memiliki minimal satu bahan',
    ),
    'CREATE_RECIPE.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Format bahan recipe tidak valid',
    ),
    'CREATE_RECIPE.ITEM_INGREDIENT_REQUIRED': new InvariantError(
      'Setiap bahan recipe harus menyertakan produk bahan',
    ),
    'CREATE_RECIPE.ITEM_UOM_REQUIRED': new InvariantError(
      'Setiap bahan recipe harus menyertakan UOM',
    ),
    'CREATE_RECIPE.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah bahan recipe harus berupa angka',
    ),
    'CREATE_RECIPE.ITEM_QTY_MUST_BE_POSITIVE': new InvariantError(
      'Jumlah bahan recipe harus lebih dari nol',
    ),
    'CREATE_RECIPE.ITEM_LOSS_OUT_OF_RANGE': new InvariantError(
      'Persentase loss bahan harus di antara 0 dan 100',
    ),
    'CREATE_RECIPE.INGREDIENT_IS_FINISHED_PRODUCT': new InvariantError(
      'Bahan tidak boleh sama dengan produk jadi resep',
    ),
    'CREATE_RECIPE.DUPLICATE_INGREDIENT': new InvariantError(
      'Bahan tidak boleh duplikat dalam satu recipe',
    ),
    'RECIPE.ONLY_DRAFT_EDITABLE': new InvariantError(
      'Hanya recipe berstatus DRAFT yang dapat diubah',
    ),
    'RECIPE.INVALID_STATUS_TRANSITION': new InvariantError(
      'Transisi status recipe tidak diperbolehkan',
    ),
    'RECIPE.INVALID_STATUS': new InvariantError('Status recipe tidak valid'),
    'RECIPE.ACTIVE_ALREADY_EXISTS': new ConflictError(
      'Sudah ada recipe aktif untuk produk ini; arsipkan dulu sebelum mengaktifkan yang baru',
    ),

    // ── Production Order ─────────────────────────────────────────
    'PRODUCTION_ORDER.NOT_FOUND': new NotFoundError('Production order tidak ditemukan'),
    'CREATE_PRODUCTION_ORDER.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data production order tidak lengkap',
    ),
    'CREATE_PRODUCTION_ORDER.RECIPE_OR_PRODUCT_REQUIRED': new InvariantError(
      'Sertakan recipeId atau productId untuk menjadwalkan produksi',
    ),
    'CREATE_PRODUCTION_ORDER.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah produksi harus berupa angka',
    ),
    'CREATE_PRODUCTION_ORDER.QTY_MUST_BE_POSITIVE': new InvariantError(
      'Jumlah produksi harus lebih dari nol',
    ),
    'RECORD_YIELD.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data yield produksi tidak lengkap',
    ),
    'RECORD_YIELD.QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah hasil produksi harus berupa angka',
    ),
    'RECORD_YIELD.QTY_MUST_BE_POSITIVE': new InvariantError(
      'Jumlah hasil produksi harus lebih dari nol',
    ),
    'RECORD_YIELD.WASTE_INVALID': new InvariantError(
      'Jumlah waste tidak valid',
    ),
    'RECORD_YIELD.RESULT_EXPIRY_REQUIRED': new InvariantError(
      'Tanggal kedaluwarsa hasil produksi wajib diisi',
    ),
    'RECORD_YIELD.RESULT_EXPIRY_INVALID': new InvariantError(
      'Tanggal kedaluwarsa hasil produksi tidak valid',
    ),
    'PRODUCTION_ORDER.INVALID_STATUS': new InvariantError('Status production order tidak valid'),
    'PRODUCTION_ORDER.INVALID_STATUS_TRANSITION': new InvariantError(
      'Transisi status production order tidak diperbolehkan',
    ),
    'PRODUCTION_ORDER.RECIPE_NOT_ACTIVE': new InvariantError(
      'Recipe harus berstatus ACTIVE untuk dapat diproduksi',
    ),
    'PRODUCTION_ORDER.RECIPE_YIELD_INVALID': new InvariantError(
      'Yield recipe tidak valid untuk menghitung skala produksi',
    ),
    'PRODUCTION_ORDER.NO_YIELD_RECORDED': new InvariantError(
      'Hasil produksi belum dicatat; catat yield terlebih dahulu',
    ),
    'PRODUCTION_ORDER.RESULT_EXPIRY_REQUIRED': new InvariantError(
      'Tanggal kedaluwarsa hasil produksi wajib diisi sebelum penyelesaian',
    ),
    'PRODUCTION_ORDER.NUMBER_CONFLICT': new InvariantError(
      'Nomor production order sudah digunakan; coba lagi',
    ),

    // ── Purchase Request ─────────────────────────────────────────
    'PURCHASE_REQUEST.NOT_FOUND': new NotFoundError('Purchase request tidak ditemukan'),
    'CREATE_PURCHASE_REQUEST.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data purchase request tidak lengkap',
    ),
    'CREATE_PURCHASE_REQUEST.EXPECTED_DATE_TOO_EARLY': new InvariantError(
      'Tanggal pengiriman yang diharapkan minimal besok atau setelahnya',
    ),
    'CREATE_PURCHASE_REQUEST.ITEMS_REQUIRED': new InvariantError(
      'Purchase request harus memiliki minimal satu item',
    ),
    'CREATE_PURCHASE_REQUEST.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Format item purchase request tidak valid',
    ),
    'CREATE_PURCHASE_REQUEST.ITEM_PRODUCT_REQUIRED': new InvariantError(
      'Setiap item purchase request harus menyertakan produk',
    ),
    'CREATE_PURCHASE_REQUEST.ITEM_UOM_REQUIRED': new InvariantError(
      'Setiap item purchase request harus menyertakan satuan (UOM)',
    ),
    'CREATE_PURCHASE_REQUEST.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah item purchase request harus berupa angka',
    ),
    'CREATE_PURCHASE_REQUEST.ITEM_QTY_MUST_BE_POSITIVE': new InvariantError(
      'Jumlah item purchase request harus lebih dari nol',
    ),
    'CREATE_PURCHASE_REQUEST.ITEM_PRICE_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Harga estimasi item purchase request harus berupa angka',
    ),
    'CREATE_PURCHASE_REQUEST.ITEM_PRICE_MUST_BE_NON_NEGATIVE': new InvariantError(
      'Harga estimasi item purchase request tidak boleh negatif',
    ),
    'REJECT_PURCHASE_REQUEST.NOTE_REQUIRED': new InvariantError(
      'Alasan penolakan wajib diisi',
    ),
    'PURCHASE_REQUEST.ONLY_EDITABLE_STATUS': new InvariantError(
      'Hanya purchase request berstatus DRAFT atau REJECTED yang dapat diubah',
    ),
    'PURCHASE_REQUEST.INVALID_STATUS_TRANSITION': new InvariantError(
      'Transisi status purchase request tidak diperbolehkan',
    ),
    'PURCHASE_REQUEST.INVALID_STATUS': new InvariantError('Status purchase request tidak valid'),

    // ── Purchase Request Attachments (doc 35 §5) ─────────────────
    'PURCHASE_REQUEST_ATTACHMENT.NOT_FOUND': new NotFoundError(
      'Lampiran purchase request tidak ditemukan',
    ),
    'UPLOAD_PURCHASE_REQUEST_ATTACHMENT.FILE_REQUIRED': new InvariantError(
      'File lampiran wajib disertakan',
    ),
    'UPLOAD_PURCHASE_REQUEST_ATTACHMENT.MIME_NOT_ALLOWED': new InvariantError(
      'Tipe file tidak diizinkan; hanya PDF, JPG, atau PNG',
    ),
    'UPLOAD_PURCHASE_REQUEST_ATTACHMENT.FILE_TOO_LARGE': new InvariantError(
      'Ukuran file melebihi batas maksimum 5 MB',
    ),

    // ── Purchase Order ───────────────────────────────────────────
    'PURCHASE_ORDER.NOT_FOUND': new NotFoundError('Purchase order tidak ditemukan'),
    'CREATE_PURCHASE_ORDER.NOT_CONTAIN_NEEDED_PROPERTY': new InvariantError(
      'Data purchase order tidak lengkap',
    ),
    'CREATE_PURCHASE_ORDER.NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Tipe data purchase order tidak sesuai',
    ),
    'CREATE_PURCHASE_ORDER.PURCHASE_REQUEST_REQUIRED': new InvariantError(
      'Purchase order harus dibuat dari purchase request',
    ),
    'CREATE_PURCHASE_ORDER.SUPPLIER_REQUIRED': new InvariantError(
      'Supplier wajib dipilih untuk purchase order',
    ),
    'CREATE_PURCHASE_ORDER.ORDER_DATE_INVALID': new InvariantError(
      'Tanggal order purchase order tidak valid',
    ),
    'CREATE_PURCHASE_ORDER.ITEMS_REQUIRED': new InvariantError(
      'Purchase order harus memiliki minimal satu item',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Format item purchase order tidak valid',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_PRODUCT_REQUIRED': new InvariantError(
      'Setiap item purchase order harus menyertakan produk',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_UOM_REQUIRED': new InvariantError(
      'Setiap item purchase order harus menyertakan satuan (UOM)',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_QTY_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Jumlah item purchase order harus berupa angka',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_QTY_MUST_BE_POSITIVE': new InvariantError(
      'Jumlah item purchase order harus lebih dari nol',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_PRICE_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Harga satuan item purchase order harus berupa angka',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_PRICE_MUST_BE_NON_NEGATIVE': new InvariantError(
      'Harga satuan item purchase order tidak boleh negatif',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_TAX_NOT_MEET_DATA_TYPE_SPECIFICATION': new InvariantError(
      'Persentase pajak item purchase order harus berupa angka',
    ),
    'CREATE_PURCHASE_ORDER.ITEM_TAX_MUST_BE_NON_NEGATIVE': new InvariantError(
      'Persentase pajak item purchase order tidak boleh negatif',
    ),
    'PURCHASE_ORDER.PR_NOT_APPROVED': new InvariantError(
      'Purchase order hanya dapat dibuat dari purchase request berstatus APPROVED',
    ),
    'PURCHASE_ORDER.SUPPLIER_INACTIVE': new InvariantError(
      'Supplier tidak aktif; tidak dapat digunakan untuk purchase order',
    ),
    'PURCHASE_ORDER.PAYMENT_TERM_INACTIVE': new InvariantError(
      'Payment term tidak aktif; tidak dapat digunakan untuk purchase order',
    ),
    'REJECT_PURCHASE_ORDER.NOTE_REQUIRED': new InvariantError(
      'Alasan penolakan purchase order wajib diisi',
    ),
    'PURCHASE_ORDER.ONLY_EDITABLE_STATUS': new InvariantError(
      'Hanya purchase order berstatus DRAFT atau REJECTED yang dapat diubah',
    ),
    'PURCHASE_ORDER.INVALID_STATUS_TRANSITION': new InvariantError(
      'Transisi status purchase order tidak diperbolehkan',
    ),
    'PURCHASE_ORDER.INVALID_STATUS': new InvariantError('Status purchase order tidak valid'),

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
    'PAYMENT_TERM.CODE_ALREADY_USED': new ConflictError(
      'Kode payment term sudah digunakan',
    ),
    'PAYMENT_TERM.IN_USE': new ConflictError(
      'Payment term tidak dapat dihapus atau dinonaktifkan karena masih digunakan oleh dokumen aktif',
    ),
    'CATEGORY.IN_USE': new ConflictError(
      'Kategori tidak dapat dihapus atau dinonaktifkan karena masih digunakan oleh produk aktif',
    ),
    'PRODUCT.SKU_ALREADY_USED': new ConflictError('SKU sudah digunakan oleh produk lain'),
    'PRODUCT.BARCODE_ALREADY_USED': new ConflictError(
      'Barcode sudah digunakan oleh produk lain',
    ),
    'PURCHASE_REQUEST.NUMBER_ALREADY_USED': new ConflictError(
      'Nomor purchase request sudah digunakan; coba lagi',
    ),
    'PURCHASE_ORDER.NUMBER_ALREADY_USED': new ConflictError(
      'Nomor purchase order sudah digunakan; coba lagi',
    ),
  } as ErrorMap,
};

export default DomainErrorTranslator;
