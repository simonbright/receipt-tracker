import type { Reminder } from '../types';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/sw.js');
}

export async function subscribeToPush(reminders: Reminder[]): Promise<boolean> {
  if (!('Notification' in window) || !('PushManager' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await registerServiceWorker();
  if (!registration) return false;

  const keyRes = await fetch('/api/push/vapid-public-key');
  if (!keyRes.ok) throw new Error('Push notifications are not configured on the server');

  const { publicKey } = await keyRes.json();

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const syncRes = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, reminders }),
  });

  if (!syncRes.ok) {
    const data = await syncRes.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to register for push notifications');
  }

  return true;
}

export async function syncRemindersToServer(reminders: Reminder[]): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, reminders }),
  });
}

export function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function isStandaloneApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
