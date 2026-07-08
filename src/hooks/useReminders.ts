import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Reminder } from '../types';
import { createEmptyReminder, MAX_REMINDERS } from '../types';
import { readStorage, writeStorage } from '../lib/storage';
import {
  isIOS,
  isStandaloneApp,
  subscribeToPush,
  syncRemindersToServer,
} from '../lib/pushNotifications';

const REMINDERS_KEY = 'receipt-tracker-reminders';
const PUSH_ENABLED_KEY = 'receipt-tracker-push-enabled';

function loadReminders(): Reminder[] {
  const parsed = readStorage<Reminder[] | null>(REMINDERS_KEY, null);
  if (parsed) {
    while (parsed.length < MAX_REMINDERS) {
      parsed.push(createEmptyReminder(uuidv4()));
    }
    return parsed.slice(0, MAX_REMINDERS);
  }
  return Array.from({ length: MAX_REMINDERS }, () => createEmptyReminder(uuidv4()));
}

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as NotificationPermission;
  });
  const [pushEnabled, setPushEnabled] = useState(() => readStorage(PUSH_ENABLED_KEY, false));
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushConfigured, setPushConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    writeStorage(REMINDERS_KEY, reminders);
  }, [reminders]);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setPushConfigured(data.pushConfigured ?? false))
      .catch(() => setPushConfigured(false));
  }, []);

  useEffect(() => {
    if (!pushEnabled || notificationPermission !== 'granted') return;
    syncRemindersToServer(reminders).catch(() => {
      /* server may be unavailable briefly */
    });
  }, [reminders, pushEnabled, notificationPermission]);

  useEffect(() => {
    if (notificationPermission !== 'granted' || !readStorage(PUSH_ENABLED_KEY, false)) return;
    syncRemindersToServer(loadReminders()).catch(() => {});
  }, [notificationPermission]);

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    setPushError(null);

    if (isIOS() && !isStandaloneApp()) {
      setPushError('On iPhone, add this app to your Home Screen first, then enable notifications.');
      return false;
    }

    try {
      const ok = await subscribeToPush(reminders);
      if (ok) {
        setNotificationPermission('granted');
        setPushEnabled(true);
        writeStorage(PUSH_ENABLED_KEY, true);
      } else {
        setNotificationPermission(Notification.permission as NotificationPermission);
      }
      return ok;
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Failed to enable notifications');
      return false;
    }
  }, [reminders]);

  const enabledCount = reminders.filter((r) => r.enabled && r.text.trim()).length;
  const needsHomeScreen = isIOS() && !isStandaloneApp();

  const hydrateFromSync = useCallback((data: { reminders: Reminder[]; pushEnabled: boolean }) => {
    const normalized = [...data.reminders];
    while (normalized.length < MAX_REMINDERS) {
      normalized.push(createEmptyReminder(uuidv4()));
    }
    setReminders(normalized.slice(0, MAX_REMINDERS));
    setPushEnabled(data.pushEnabled);
    writeStorage(PUSH_ENABLED_KEY, data.pushEnabled);
  }, []);

  return {
    reminders,
    updateReminder,
    notificationPermission,
    requestNotificationPermission,
    enabledCount,
    pushEnabled,
    pushError,
    pushConfigured,
    needsHomeScreen,
    hydrateFromSync,
  };
}
