import pg from 'pg';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
const jsonPath = path.join(dataDir, 'sync-data.json');

let pool = null;
let backend = null;
let syncError = null;

function readJsonStore() {
  if (!existsSync(jsonPath)) return {};
  try {
    return JSON.parse(readFileSync(jsonPath, 'utf8'));
  } catch {
    return {};
  }
}

function writeJsonStore(store) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(store, null, 2)}\n`);
}

function useJsonBackend(reason) {
  pool = null;
  backend = 'json';
  syncError = reason || null;
  console.warn(`Sync database: JSON fallback${reason ? ` (${reason})` : ''}`);
}

function isValidDatabaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('postgres://') && !trimmed.startsWith('postgresql://')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed.replace(/^postgresql:/, 'postgres:'));
    if (!parsed.hostname) return false;
    if (parsed.hostname === 'base' || parsed.hostname === 'localhost') {
      // "base" is a common typo/placeholder; localhost won't work on Render.
      return process.env.NODE_ENV !== 'production';
    }
    return true;
  } catch {
    return false;
  }
}

export async function initDb() {
  syncError = null;
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    useJsonBackend();
    console.log('Sync database: local JSON (set DATABASE_URL on Render for persistent sync)');
    return;
  }

  if (!isValidDatabaseUrl(databaseUrl)) {
    useJsonBackend('DATABASE_URL looks invalid — paste the full Internal Database URL from Render');
    return;
  }

  try {
    const nextPool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
    await nextPool.query(`
      CREATE TABLE IF NOT EXISTS sync_data (
        sync_key TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    pool = nextPool;
    backend = 'postgres';
    console.log('Sync database: PostgreSQL');
  } catch (err) {
    useJsonBackend(err.message || 'PostgreSQL connection failed');
  }
}

export function isSyncConfigured() {
  return backend !== null;
}

export function getSyncBackend() {
  return backend;
}

export function getSyncError() {
  return syncError;
}

export async function getSyncRecord(syncKey) {
  if (backend === 'postgres') {
    const result = await pool.query(
      'SELECT payload, updated_at FROM sync_data WHERE sync_key = $1',
      [syncKey]
    );
    if (result.rowCount === 0) return null;
    const row = result.rows[0];
    return {
      payload: row.payload,
      updatedAt: row.updated_at.toISOString(),
    };
  }

  const store = readJsonStore();
  const record = store[syncKey];
  if (!record) return null;
  return {
    payload: record.payload,
    updatedAt: record.updatedAt,
  };
}

export async function putSyncRecord(syncKey, payload, updatedAt) {
  const iso = updatedAt || new Date().toISOString();

  if (backend === 'postgres') {
    await pool.query(
      `INSERT INTO sync_data (sync_key, payload, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (sync_key)
       DO UPDATE SET payload = EXCLUDED.payload, updated_at = EXCLUDED.updated_at`,
      [syncKey, payload, iso]
    );
    return { updatedAt: iso };
  }

  const store = readJsonStore();
  store[syncKey] = { payload, updatedAt: iso };
  writeJsonStore(store);
  return { updatedAt: iso };
}
