import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const { Pool } = pg;
const projectRoot = resolve(import.meta.dirname, '../..');
const envPath = resolve(import.meta.dirname, '../.env');
if (existsSync(envPath)) loadEnvFile(envPath);

const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool({
  ...(databaseUrl
    ? { connectionString: databaseUrl }
    : {
        host: process.env.POSTGRES_HOST ?? '127.0.0.1',
        port: Number(process.env.POSTGRES_PORT ?? 55432),
        user: process.env.POSTGRES_USER ?? 'vigia',
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB ?? 'vigia',
      }),
  connectionTimeoutMillis: 5000,
});

try {
  const { rows } = await pool.query(
    'SELECT current_database() AS database, current_user AS username, inet_server_port() AS port',
  );
  const target = rows[0];
  console.log(`Conectado a PostgreSQL: base ${target.database}, usuario ${target.username}, puerto ${target.port}.`);
  await migrate(drizzle(pool), {
    migrationsFolder: resolve(projectRoot, 'apps/api/drizzle'),
  });
  const requiredObjects = [
    'users', 'terms_and_conditions', 'terms_acceptances', 'zones', 'cameras',
    'sirens', 'incident_categories', 'incidents', 'evidence', 'emergency_contacts',
    'notifications', 'protocols', 'v_incidents_by_hour', 'v_incidents_by_category',
    'v_false_alarm_percentage',
  ];
  const { rows: objects } = await pool.query(`
    SELECT table_name, table_type
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY($1::text[])
  `, [requiredObjects]);
  const found = new Set(objects.map(({ table_name }) => table_name));
  const missing = requiredObjects.filter((name) => !found.has(name));
  if (missing.length) {
    throw new Error(`La migración terminó pero faltan objetos: ${missing.join(', ')}`);
  }
  const tables = objects.filter(({ table_type }) => table_type === 'BASE TABLE').length;
  const views = objects.filter(({ table_type }) => table_type === 'VIEW').length;
  console.log(`Migración completada y verificada: ${tables} tablas y ${views} vistas del esquema VigIA.`);
} catch (error) {
  console.error('No se pudo aplicar la migración de PostgreSQL.');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
