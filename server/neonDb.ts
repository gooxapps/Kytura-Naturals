import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../src/db/schema.ts';

export function getNeonConnectionUrl(): string | null {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    '';
  return url.trim() ? url.trim() : null;
}

export function isNeonConfigured(): boolean {
  return Boolean(getNeonConnectionUrl());
}

let cachedDb: NeonHttpDatabase<typeof schema> | null = null;
let cachedSql: ReturnType<typeof neon> | null = null;

export function getNeonDb(): NeonHttpDatabase<typeof schema> {
  if (cachedDb) return cachedDb;
  const url = getNeonConnectionUrl();
  if (!url) {
    throw new Error(
      'Neon PostgreSQL connection string is missing. Set DATABASE_URL, POSTGRES_URL, or POSTGRES_URL_NON_POOLING.'
    );
  }
  cachedSql = neon(url);
  cachedDb = drizzle(cachedSql, { schema });
  return cachedDb;
}

export function getNeonSqlClient() {
  if (!cachedSql) {
    getNeonDb();
  }
  return cachedSql!;
}
