import { useCallback, useEffect, useRef, useState } from 'react';
import type { Expense, Reminder, ReportSettings } from '../types';
import {
  clearPendingSync,
  fetchRemoteSync,
  getLocalSyncAt,
  hasPendingSync,
  isBrowserOnline,
  isRemoteNewer,
  markPendingSync,
  pushRemoteSync,
  setLocalSyncAt,
  type SyncPayload,
  type SyncStatus,
} from '../lib/syncClient';

interface UseAutoSyncOptions {
  expenses: Expense[];
  settings: ReportSettings;
  reminders: Reminder[];
  pushEnabled: boolean;
  syncEnabled: boolean;
  onApplyRemote: (payload: SyncPayload) => void;
}

const PUSH_DELAY_MS = 1500;

export function useAutoSync({
  expenses,
  settings,
  reminders,
  pushEnabled,
  syncEnabled,
  onApplyRemote,
}: UseAutoSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => {
    if (!isBrowserOnline()) return hasPendingSync() ? 'pending' : 'offline';
    return 'loading';
  });
  const applyingRemote = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPullDone = useRef(false);
  const syncing = useRef(false);

  const buildPayload = useCallback((): SyncPayload => {
    return {
      expenses,
      settings,
      reminders,
      pushEnabled,
      updatedAt: new Date().toISOString(),
    };
  }, [expenses, settings, reminders, pushEnabled]);

  const applyRemote = useCallback(
    (payload: SyncPayload) => {
      applyingRemote.current = true;
      onApplyRemote(payload);
      setLocalSyncAt(payload.updatedAt);
      applyingRemote.current = false;
    },
    [onApplyRemote]
  );

  const pushToServer = useCallback(async () => {
    if (!syncEnabled || applyingRemote.current || syncing.current) return false;

    if (!isBrowserOnline()) {
      markPendingSync();
      setSyncStatus('offline');
      return false;
    }

    syncing.current = true;
    const payload = buildPayload();
    setSyncStatus('syncing');

    const result = await pushRemoteSync(payload);
    syncing.current = false;

    if (result === 'ok') {
      setSyncStatus('synced');
      return true;
    }

    if (result === 'offline') {
      setSyncStatus(hasPendingSync() ? 'pending' : 'offline');
      return false;
    }

    if (result === 'conflict') {
      const remote = await fetchRemoteSync();
      const localAt = payload.updatedAt;
      if (remote?.payload && isRemoteNewer(remote.updatedAt, localAt)) {
        applyRemote(remote.payload);
        clearPendingSync();
        setSyncStatus('synced');
        return true;
      }
      const retry = await pushRemoteSync({ ...payload, updatedAt: new Date().toISOString() });
      setSyncStatus(retry === 'ok' ? 'synced' : retry === 'offline' ? 'pending' : 'error');
      return retry === 'ok';
    }

    setSyncStatus('error');
    return false;
  }, [syncEnabled, buildPayload, applyRemote]);

  const pullFromServer = useCallback(async () => {
    if (!syncEnabled) {
      setSyncStatus(isBrowserOnline() ? 'idle' : hasPendingSync() ? 'pending' : 'offline');
      return;
    }

    if (!isBrowserOnline()) {
      setSyncStatus(hasPendingSync() ? 'pending' : 'offline');
      return;
    }

    if (hasPendingSync()) {
      await pushToServer();
      return;
    }

    setSyncStatus('syncing');
    const remote = await fetchRemoteSync();

    if (!remote) {
      setSyncStatus(hasPendingSync() ? 'pending' : 'offline');
      return;
    }

    const localAt = getLocalSyncAt();

    if (remote.payload && isRemoteNewer(remote.updatedAt, localAt)) {
      applyRemote(remote.payload);
      setSyncStatus('synced');
      return;
    }

    if (!remote.payload) {
      await pushToServer();
      return;
    }

    setSyncStatus('synced');
  }, [syncEnabled, applyRemote, pushToServer]);

  const syncNow = useCallback(async () => {
    if (!syncEnabled) return;
    await pullFromServer();
  }, [syncEnabled, pullFromServer]);

  useEffect(() => {
    if (!syncEnabled) {
      initialPullDone.current = true;
      setSyncStatus('idle');
      return;
    }

    if (initialPullDone.current) return;
    initialPullDone.current = true;
    pullFromServer();
  }, [syncEnabled, pullFromServer]);

  useEffect(() => {
    if (!syncEnabled || !initialPullDone.current || applyingRemote.current) return;

    if (!isBrowserOnline()) {
      markPendingSync();
      setSyncStatus('pending');
      return;
    }

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      markPendingSync();
      setSyncStatus('pending');
      pushToServer();
    }, PUSH_DELAY_MS);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [expenses, settings, reminders, pushEnabled, syncEnabled, pushToServer]);

  useEffect(() => {
    const onOnline = () => {
      syncNow();
    };
    const onOffline = () => {
      setSyncStatus(hasPendingSync() ? 'pending' : 'offline');
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isBrowserOnline()) {
        syncNow();
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [syncNow]);

  return { syncStatus };
}
