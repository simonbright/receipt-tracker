import type { Reminder } from '../types';
import { TIMEZONE_OPTIONS, MAX_REMINDERS } from '../types';
import { formatTime12h, getTimezoneAbbrev, getTimeInTimezone, getNextReminderLabel } from '../lib/timezone';
import type { ActiveAlert, NotificationPermission } from '../hooks/useReminders';

interface RemindersProps {
  reminders: Reminder[];
  onUpdate: (id: string, updates: Partial<Reminder>) => void;
  activeAlerts: ActiveAlert[];
  onDismissAlert: (id: string) => void;
  notificationPermission: NotificationPermission;
  onRequestPermission: () => Promise<boolean>;
  enabledCount: number;
}

export default function Reminders({
  reminders,
  onUpdate,
  activeAlerts,
  onDismissAlert,
  notificationPermission,
  onRequestPermission,
  enabledCount,
}: RemindersProps) {
  return (
    <section className="card overflow-hidden">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className="px-4 py-3 bg-brand-600 text-white flex items-start gap-3 animate-pulse"
        >
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Reminder</p>
            <p className="text-sm text-brand-100">{alert.text}</p>
          </div>
          <button
            type="button"
            onClick={() => onDismissAlert(alert.id)}
            className="text-brand-200 hover:text-white text-xs font-medium flex-shrink-0"
          >
            Dismiss
          </button>
        </div>
      ))}

      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Daily Reminders</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Up to {MAX_REMINDERS} reminders per day · {enabledCount} active
          </p>
        </div>
        {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
          <button type="button" onClick={onRequestPermission} className="btn-primary text-xs py-2 px-3">
            Enable notifications
          </button>
        )}
        {notificationPermission === 'granted' && (
          <span className="text-xs text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full font-medium">
            Notifications on
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {reminders.map((reminder, index) => (
          <ReminderRow
            key={reminder.id}
            index={index}
            reminder={reminder}
            onUpdate={onUpdate}
          />
        ))}
      </div>

      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Reminders fire as browser notifications while this app is open.
          {notificationPermission === 'denied' && (
            <span className="text-amber-700"> Notifications are blocked — enable them in your browser settings.</span>
          )}
        </p>
      </div>
    </section>
  );
}

function ReminderRow({
  index,
  reminder,
  onUpdate,
}: {
  index: number;
  reminder: Reminder;
  onUpdate: (id: string, updates: Partial<Reminder>) => void;
}) {
  const now = getTimeInTimezone(reminder.timezone);
  const nextLabel = getNextReminderLabel(reminder, now);
  const abbrev = getTimezoneAbbrev(reminder.timezone);

  return (
    <div className={`px-6 py-4 ${reminder.enabled ? 'bg-white' : 'bg-gray-50/50'}`}>
      <div className="flex items-center gap-3 mb-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={reminder.enabled}
            onChange={(e) => onUpdate(reminder.id, { enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
        </label>
        <span className="text-sm font-medium text-gray-700">Reminder {index + 1}</span>
        {reminder.enabled && nextLabel && (
          <span className="text-xs text-gray-400 ml-auto hidden sm:inline">{nextLabel}</span>
        )}
      </div>

      <div className={`grid sm:grid-cols-12 gap-3 ${!reminder.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="sm:col-span-3">
          <label className="label">Time</label>
          <input
            type="time"
            className="input"
            value={reminder.time}
            onChange={(e) => onUpdate(reminder.id, { time: e.target.value })}
          />
          <p className="text-xs text-gray-400 mt-1">{formatTime12h(reminder.time)} {abbrev}</p>
        </div>

        <div className="sm:col-span-4">
          <label className="label">Timezone</label>
          <select
            className="input"
            value={reminder.timezone}
            onChange={(e) => onUpdate(reminder.id, { timezone: e.target.value })}
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-5">
          <label className="label">Reminder text</label>
          <input
            className="input"
            value={reminder.text}
            onChange={(e) => onUpdate(reminder.id, { text: e.target.value })}
            placeholder="e.g. Take picture of parking ticket"
          />
        </div>
      </div>
    </div>
  );
}
