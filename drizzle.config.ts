import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'drizzle-kit';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const databaseUrl = process.env.DATABASE_URL;
const password = process.env.POSTGRES_PASSWORD;

export default defineConfig({
  dialect: 'postgresql',
  schema: './apps/api/src/database/schema.ts',
  out: './apps/api/drizzle',
  dbCredentials: databaseUrl
    ? { url: databaseUrl }
    : password
      ? {
          host: '127.0.0.1',
          port: Number(process.env.POSTGRES_PORT || 55432),
          user: 'vigia',
          password,
          database: 'vigia',
          ssl: false,
        }
      : undefined,
});
