#!/bin/bash
# Dijalankan otomatis oleh image postgres saat container pertama kali dibuat.
# Membuat database test terpisah agar `npm run migrate:test` punya target.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
  SELECT 'CREATE DATABASE erp_bakery_test'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'erp_bakery_test')\gexec
EOSQL

echo "Database erp_bakery_test siap."
