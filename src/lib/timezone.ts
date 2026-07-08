export interface TimeInTimezone {
  dateKey: string;
  hours: number;
  minutes: number;
}

export function getTimeInTimezone(timezone: string): TimeInTimezone {
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
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  let hours = parseInt(get('hour'), 10);
  const minutes = parseInt(get('minute'), 10);
  if (hours === 24) hours = 0;
  const year = get('year');
  const month = get('month');
  const day = get('day');

  return {
    dateKey: `${year}-${month}-${day}`,
    hours,
    minutes,
  };
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${ampm}`;
}

export function getTimezoneAbbrev(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}

export function shouldFireReminder(
  reminder: { enabled: boolean; time: string; lastFiredDate: string | null; text: string },
  now: TimeInTimezone
): boolean {
  if (!reminder.enabled || !reminder.text.trim()) return false;
  if (reminder.lastFiredDate === now.dateKey) return false;

  const [rh, rm] = reminder.time.split(':').map((v) => parseInt(v, 10));
  return now.hours === rh && now.minutes === rm;
}

export function getNextReminderLabel(
  reminder: { enabled: boolean; time: string; timezone: string; text: string },
  now: TimeInTimezone
): string | null {
  if (!reminder.enabled || !reminder.text.trim()) return null;

  const [rh, rm] = reminder.time.split(':').map((v) => parseInt(v, 10));
  const nowMinutes = now.hours * 60 + now.minutes;
  const reminderMinutes = rh * 60 + rm;
  const abbrev = getTimezoneAbbrev(reminder.timezone);

  if (nowMinutes < reminderMinutes) {
    return `Today at ${formatTime12h(reminder.time)} ${abbrev}`;
  }
  return `Tomorrow at ${formatTime12h(reminder.time)} ${abbrev}`;
}
