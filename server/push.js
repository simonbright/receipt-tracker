import webpush from 'web-push';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'push-subscriptions.json');

function getTimeInTimezone(timezone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '0';

  let hours = parseInt(get('hour'), 10);
  const minutes = parseInt(get('minute'), 10);
  if (hours === 24) hours = 0;

  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hours,
    minutes,
  };
}

function shouldFireReminder(reminder, now) {
  if (!reminder.enabled || !reminder.text?.trim()) return false;
  if (reminder.lastFiredDate === now.dateKey) return false;

  const [rh, rm] = reminder.time.split(':').map((v) => parseInt(v, 10));
  return now.hours === rh && now.minutes === rm;
}

function loadSubscriptions() {
  try {
    if (!existsSync(DATA_FILE)) return [];
    return JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveSubscriptions(subscriptions) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(subscriptions, null, 2));
}

function subscriptionId(subscription) {
  return subscription?.endpoint ?? '';
}

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function setupPush(app) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (isPushConfigured()) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    setInterval(checkAndSendReminders, 30_000);
    console.log('Web Push reminders enabled');
  } else {
    console.warn('Web Push not configured — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY');
  }

  app.get('/api/push/vapid-public-key', (_req, res) => {
    if (!publicKey) {
      return res.status(503).json({ error: 'Push notifications not configured on server' });
    }
    res.json({ publicKey });
  });

  app.post('/api/push/subscribe', (req, res) => {
    if (!isPushConfigured()) {
      return res.status(503).json({ error: 'Push notifications not configured on server' });
    }

    const { subscription, reminders } = req.body;
    if (!subscription?.endpoint || !Array.isArray(reminders)) {
      return res.status(400).json({ error: 'Subscription and reminders are required' });
    }

    const id = subscriptionId(subscription);
    const all = loadSubscriptions().filter((s) => s.id !== id);
    all.push({
      id,
      subscription,
      reminders,
      updatedAt: new Date().toISOString(),
    });
    saveSubscriptions(all);

    res.json({ ok: true });
  });
}

async function checkAndSendReminders() {
  if (!isPushConfigured()) return;

  const subscriptions = loadSubscriptions();
  let changed = false;

  for (const entry of subscriptions) {
    for (const reminder of entry.reminders) {
      const now = getTimeInTimezone(reminder.timezone);
      if (!shouldFireReminder(reminder, now)) continue;

      try {
        await webpush.sendNotification(
          entry.subscription,
          JSON.stringify({
            title: 'Receipt Tracker Reminder',
            body: reminder.text,
          })
        );
        reminder.lastFiredDate = now.dateKey;
        changed = true;
        console.log(`Push sent: "${reminder.text}" to ${entry.id.slice(0, 40)}…`);
      } catch (err) {
        console.error('Push failed:', err.statusCode || err.message);
        if (err.statusCode === 404 || err.statusCode === 410) {
          entry._remove = true;
          changed = true;
        }
      }
    }
  }

  if (changed) {
    const cleaned = subscriptions.filter((s) => !s._remove);
    saveSubscriptions(cleaned);
  }
}
