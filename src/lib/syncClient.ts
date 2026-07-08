import type { Expense, Reminder, ReportSettings } from '../types';

export interface SyncPayload {
  expenses: Expense[];
  settings: ReportSettings;
  reminders: Reminder[];
  pushEnabled: boolean;
  updatedAt: string;
}

export type SyncStatus =
  | 'loading'
  | 'idle'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'pending'
  | 'error';

export const SYNC_AT_KEY = 'receipt-tracker-sync-at';
const PENDING_SYNC_KEY = 'receipt-tracker-pending-sync';
const HEALTH_CACHE_KEY = 'receipt-tracker-health-cache';

export interface CachedHealth {
  aiConfigured: boolean;
  syncConfigured: boolean;
  cachedAt: string;
}

function syncHeaders(): HeadersInit {
  const key = import.meta.env.VITE_SYNC_KEY;
  return key ? { 'Content-Type': 'application/json', 'X-Sync-Key': key } : { 'Content-Type': 'application/json' };
}

export function isBrowserOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function markPendingSync() {
  try {
    localStorage.setItem(PENDING_SYNC_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function clearPendingSync() {
  try {
    localStorage.removeItem(PENDING_SYNC_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPendingSync(): boolean {
  try {
    return localStorage.getItem(PENDING_SYNC_KEY) === '1';
  } catch {
    return false;
  }
}

export function cacheHealthStatus(status: Omit<CachedHealth, 'cachedAt'>) {
  try {
    const cached: CachedHealth = { ...status, cachedAt: new Date().toISOString() };
    localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify(cached));
  } catch {
    /* ignore */
  }
}

export function getCachedHealth(): CachedHealth | null {
  try {
    const raw = localStorage.getItem(HEALTH_CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedHealth) : null;
  } catch {
    return null;
  }
}

export function getLocalSyncAt(): string {
  try {
    return localStorage.getItem(SYNC_AT_KEY) || '1970-01-01T00:00:00.000Z';
  } catch {
    return '1970-01-01T00:00:00.000Z';
  }
}

export function setLocalSyncAt(iso: string) {
  try {
    localStorage.setItem(SYNC_AT_KEY, iso);
  } catch {
    /* quota or private mode */
  }
}

function isNetworkError(err: unknown): boolean {
  if (!isBrowserOnline()) return true;
  if (err instanceof TypeError) return true;
  return false;
}

export async function fetchRemoteSync(): Promise<{ payload: SyncPayload | null; updatedAt: string | null } | null> {
  if (!isBrowserOnline()) return null;

  try {
    const res = await fetch('/api/sync', { headers: syncHeaders() });
    if (res.status === 401 || res.status === 503) return null;
    if (!res.ok) throw new Error(`Sync fetch failed (${res.status})`);
    const data = await res.json();
    return {
      payload: data.payload ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  } catch (err) {
    if (isNetworkError(err)) return null;
    return null;
  }
}

export async function pushRemoteSync(payload: SyncPayload): Promise<'ok' | 'conflict' | 'offline' | 'error'> {
  if (!isBrowserOnline()) {
    markPendingSync();
    return 'offline';
  }

  try {
    const res = await fetch('/api/sync', {
      method: 'PUT',
      headers: syncHeaders(),
      body: JSON.stringify({ payload }),
    });

    if (res.status === 409) {
      const data = await res.json();
      if (data.payload?.updatedAt) {
        setLocalSyncAt(data.payload.updatedAt);
      }
      return 'conflict';
    }

    if (!res.ok) return 'error';

    const data = await res.json();
    if (data.updatedAt) setLocalSyncAt(data.updatedAt);
    else setLocalSyncAt(payload.updatedAt);
    clearPendingSync();
    return 'ok';
  } catch (err) {
    if (isNetworkError(err)) {
      markPendingSync();
      return 'offline';
    }
    markPendingSync();
    return 'error';
  }
}

export function isRemoteNewer(remoteAt: string | null, localAt: string): boolean {
  if (!remoteAt) return false;
  return remoteAt > localAt;
}

export async function fetchHealth(): Promise<CachedHealth | null> {
  if (!isBrowserOnline()) return getCachedHealth();

  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    const data = await res.json();
    const status = {
      aiConfigured: Boolean(data.aiConfigured),
      syncConfigured: Boolean(data.syncConfigured),
    };
    cacheHealthStatus(status);
    return { ...status, cachedAt: new Date().toISOString() };
  } catch {
    return getCachedHealth();
  }
}
