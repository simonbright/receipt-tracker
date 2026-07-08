import type { Expense, Reminder, ReportSettings } from '../types';

export interface SyncPayload {
  expenses: Expense[];
  settings: ReportSettings;
  reminders: Reminder[];
  pushEnabled: boolean;
  updatedAt: string;
}

export type SyncStatus = 'loading' | 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

export const SYNC_AT_KEY = 'receipt-tracker-sync-at';

function syncHeaders(): HeadersInit {
  const key = import.meta.env.VITE_SYNC_KEY;
  return key ? { 'Content-Type': 'application/json', 'X-Sync-Key': key } : { 'Content-Type': 'application/json' };
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

export async function fetchRemoteSync(): Promise<{ payload: SyncPayload | null; updatedAt: string | null } | null> {
  try {
    const res = await fetch('/api/sync', { headers: syncHeaders() });
    if (res.status === 401 || res.status === 503) return null;
    if (!res.ok) throw new Error(`Sync fetch failed (${res.status})`);
    const data = await res.json();
    return {
      payload: data.payload ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

export async function pushRemoteSync(payload: SyncPayload): Promise<'ok' | 'conflict' | 'error'> {
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
    return 'ok';
  } catch {
    return 'error';
  }
}

export function isRemoteNewer(remoteAt: string | null, localAt: string): boolean {
  if (!remoteAt) return false;
  return remoteAt > localAt;
}
