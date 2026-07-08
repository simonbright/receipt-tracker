import { useCallback, useEffect, useRef, useState } from 'react';
import type { Expense, Reminder, ReportSettings } from '../types';
import {
  fetchRemoteSync,
  getLocalSyncAt,
  isRemoteNewer,
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
  syncAvailable: boolean;
  onApplyRemote: (payload: SyncPayload) => void;
}

const PUSH_DELAY_MS = 1500;

export function useAutoSync({
  expenses,
  settings,
  reminders,
  pushEnabled,
  syncAvailable,
  onApplyRemote,
}: UseAutoSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const applyingRemote = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialPullDone = useRef(false);

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

  const pullFromServer = useCallback(async () => {
    if (!syncAvailable) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    const remote = await fetchRemoteSync();
    if (!remote) {
      setSyncStatus('offline');
      return;
    }

    const localAt = getLocalSyncAt();

    if (remote.payload && isRemoteNewer(remote.updatedAt, localAt)) {
      applyRemote(remote.payload);
      setSyncStatus('synced');
      return;
    }

    if (!remote.payload) {
      const payload = buildPayload();
      setLocalSyncAt(payload.updatedAt);
      const result = await pushRemoteSync(payload);
      setSyncStatus(result === 'error' ? 'error' : 'synced');
      return;
    }

    setSyncStatus('synced');
  }, [syncAvailable, applyRemote, buildPayload]);

  const pushToServer = useCallback(async () => {
    if (!syncAvailable || applyingRemote.current) return;

    const payload = buildPayload();
    setLocalSyncAt(payload.updatedAt);
    setSyncStatus('syncing');

    const result = await pushRemoteSync(payload);
    if (result === 'conflict') {
      const remote = await fetchRemoteSync();
      if (remote?.payload) applyRemote(remote.payload);
      setSyncStatus('synced');
      return;
    }

    setSyncStatus(result === 'error' ? 'error' : 'synced');
  }, [syncAvailable, buildPayload, applyRemote]);

  useEffect(() => {
    if (!syncAvailable || initialPullDone.current) return;
    initialPullDone.current = true;
    pullFromServer();
  }, [syncAvailable, pullFromServer]);

  useEffect(() => {
    if (!syncAvailable || !initialPullDone.current || applyingRemote.current) return;

    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushToServer();
    }, PUSH_DELAY_MS);

    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [expenses, settings, reminders, pushEnabled, syncAvailable, pushToServer]);

  useEffect(() => {
    if (!syncAvailable) return;

    const onVisible = () => {
      if (document.visibilityState === 'visible') pullFromServer();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [syncAvailable, pullFromServer]);

  return { syncStatus };
}
