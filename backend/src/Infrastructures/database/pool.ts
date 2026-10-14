import { Pool, PoolConfig } from 'pg';

const isProduction = process.env.NODE_ENV === 'production';
const isSupabase =
  Boolean(process.env.PGHOST?.includes('supabase')) ||
  Boolean(process.env.DATABASE_URL?.includes('supabase'));
const useSsl =
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSL === 'true' ||
  isSupabase ||
  isProduction;

const sslConfig = useSsl ? { rejectUnauthorized: false } : undefined;

const testConfig: PoolConfig = {
  host: process.env.PGHOST_TEST,
  port: Number(process.env.PGPORT_TEST) || 5435,
  user: process.env.PGUSER_TEST,
  password: process.env.PGPASSWORD_TEST,
  database: process.env.PGDATABASE_TEST,
};

const mainConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig,
    }
  : {
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: sslConfig,
    };

const pool = process.env.NODE_ENV === 'test' ? new Pool(testConfig) : new Pool(mainConfig);

export default pool;

