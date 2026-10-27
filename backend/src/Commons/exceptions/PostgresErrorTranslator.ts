import { ClientError } from './ClientError';
import { ConflictError } from './ConflictError';
import { InvariantError } from './InvariantError';

/**
 * Shape of the diagnostic fields pg attaches to a DatabaseError.
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export interface PostgresErrorFields {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  schema?: string;
  column?: string;
}

const PG_CODE_PATTERN = /^[0-9A-Z]{5}$/;

/**
 * Postgres error classes whose cause is a defect in the query or schema, not in
 * the request. These must stay 5xx: no rewording makes them actionable for the
 * person filling the form.
 */
const INTERNAL_CLASSES = ['42', '08', '53', '54', '58', 'XX'];

export function asPostgresError(error: unknown): PostgresErrorFields | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as Record<string, unknown>;
  const code = candidate.code;
  if (typeof code !== 'string' || !PG_CODE_PATTERN.test(code)) return null;

  const pick = (key: string): string | undefined =>
    typeof candidate[key] === 'string' ? (candidate[key] as string) : undefined;

  return {
    code,
    detail: pick('detail'),
    constraint: pick('constraint'),
    table: pick('table'),
    schema: pick('schema'),
    column: pick('column'),
  };
}

export function isInternalPostgresError(fields: PostgresErrorFields): boolean {
  return INTERNAL_CLASSES.includes((fields.code ?? '').slice(0, 2));
}

/** `Key (company_id, code)=(uuid, PC-001) already exists.` → `company_id, code` */
function columnsFromDetail(detail: string | undefined): string | null {
  const match = detail?.match(/^Key \(([^)]+)\)=/);
  if (!match) return null;
  const columns = match[1]
    .split(',')
    .map((column) => column.trim())
    .filter((column) => column !== 'company_id' && column !== 'deleted_at');
  return columns.length > 0 ? columns.join(', ') : null;
}

function humanTable(table: string | undefined): string {
  return table ? table.replace(/_/g, ' ') : 'data';
}

/**
 * Turns a Postgres driver error into a user-facing ClientError when the cause is
 * something the user can act on (duplicate, missing reference, missing field,
 * concurrent edit). Returns null for defects in our own SQL or infrastructure,
 * which the caller should keep reporting as 5xx.
 */
export function translatePostgresError(fields: PostgresErrorFields): ClientError | null {
  const columns = columnsFromDetail(fields.detail);

  switch (fields.code) {
    case '23505':
      return new ConflictError(
        columns
          ? `Data dengan ${columns} tersebut sudah terdaftar. Gunakan nilai lain.`
          : `Data ${humanTable(fields.table)} tersebut sudah terdaftar. Gunakan nilai lain.`,
      );

    case '23503':
      return new InvariantError(
        'Data yang direferensikan tidak ditemukan atau masih dipakai oleh data lain. ' +
          'Periksa kembali pilihan yang direferensikan.',
      );

    case '23502':
      return new InvariantError(
        fields.column
          ? `Field "${fields.column}" wajib diisi.`
          : 'Ada field wajib yang belum diisi.',
      );

    case '23514':
      return new InvariantError(
        'Nilai yang dikirim tidak memenuhi aturan validasi database. ' +
          'Periksa kembali angka dan tanggal yang diisi.',
      );

    case '22P02':
    case '22007':
      return new InvariantError(
        'Format data tidak valid. Periksa kembali format angka, tanggal, atau ID yang dikirim.',
      );

    case '22003':
      return new InvariantError('Nilai angka terlalu besar untuk disimpan.');

    case '22001':
      return new InvariantError('Teks yang diisi melebihi batas panjang yang diizinkan.');

    case '40001':
      return new ConflictError(
        'Data ini sedang diubah oleh proses lain sehingga transaksi dibatalkan. Silakan coba lagi.',
      );

    case '40P01':
      return new ConflictError(
        'Terjadi bentrok antar transaksi yang berjalan bersamaan. Silakan coba lagi.',
      );

    case '55P03':
    case '57014':
      return new ConflictError(
        'Data sedang terkunci oleh proses lain dan permintaan kehabisan waktu. Silakan coba lagi.',
      );

    default:
      return null;
  }
}
