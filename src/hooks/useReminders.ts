import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Reminder } from '../types';
import { createEmptyReminder, MAX_REMINDERS } from '../types';
import { getTimeInTimezone, shouldFireReminder } from '../lib/timezone';

const REMINDERS_KEY = 'receipt-tracker-reminders';

function loadReminders(): Reminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    if (raw) {
      const parsed: Reminder[] = JSON.parse(raw);
      while (parsed.length < MAX_REMINDERS) {
        parsed.push(createEmptyReminder(uuidv4()));
      }
      return parsed.slice(0, MAX_REMINDERS);
    }
  } catch {
    /* fall through */
  }
  return Array.from({ length: MAX_REMINDERS }, () => createEmptyReminder(uuidv4()));
}

export type NotificationPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ActiveAlert {
  id: string;
  text: string;
  firedAt: string;
}

async function showBrowserNotification(text: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg) {
      await reg.showNotification('Receipt Tracker Reminder', {
        body: text,
        icon: '/receipt.svg',
        badge: '/receipt.svg',
        tag: `reminder-${Date.now()}`,
      });
      return;
    }
  } catch {
    /* fall back to Notification API */
  }

  new Notification('Receipt Tracker Reminder', {
    body: text,
    icon: '/receipt.svg',
    tag: 'receipt-reminder',
  });
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>(loadReminders);
  const [activeAlerts, setActiveAlerts] = useState<ActiveAlert[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as NotificationPermission;
  });

  const remindersRef = useRef(reminders);
  remindersRef.current = reminders;

  useEffect(() => {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const updateReminder = useCallback((id: string, updates: Partial<Reminder>) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const result = await Notification.requestPermission();
    setNotificationPermission(result as NotificationPermission);
    return result === 'granted';
  }, []);

  const markFired = useCallback((id: string, dateKey: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, lastFiredDate: dateKey } : r))
    );
  }, []);

  useEffect(() => {
    const checkReminders = () => {
      const current = remindersRef.current;

      for (const reminder of current) {
        const now = getTimeInTimezone(reminder.timezone);
        if (!shouldFireReminder(reminder, now)) continue;

        markFired(reminder.id, now.dateKey);
        showBrowserNotification(reminder.text);
        setActiveAlerts((prev) => [
          ...prev,
          { id: `${reminder.id}-${now.dateKey}`, text: reminder.text, firedAt: new Date().toISOString() },
        ]);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15_000);
    return () => clearInterval(interval);
  }, [markFired]);

  const enabledCount = reminders.filter((r) => r.enabled && r.text.trim()).length;

  return {
    reminders,
    updateReminder,
    activeAlerts,
    dismissAlert,
    notificationPermission,
    requestNotificationPermission,
    enabledCount,
  };
}
