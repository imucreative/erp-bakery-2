import { Pool, PoolConfig } from 'pg';

const testConfig: PoolConfig = {
  host: process.env.PGHOST_TEST,
  port: Number(process.env.PGPORT_TEST) || 5435,
  user: process.env.PGUSER_TEST,
  password: process.env.PGPASSWORD_TEST,
  database: process.env.PGDATABASE_TEST,
};

const mainConfig: PoolConfig = {
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5435,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
};

const pool = process.env.NODE_ENV === 'test' ? new Pool(testConfig) : new Pool(mainConfig);

export default pool;
