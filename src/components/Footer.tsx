import { buildInfo } from '../build-info';
import type { SyncStatus } from '../lib/syncClient';

function formatDeployTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function syncLabel(status: SyncStatus) {
  switch (status) {
    case 'loading':
      return 'Syncing…';
    case 'syncing':
      return 'Saving…';
    case 'synced':
      return 'Synced';
    case 'offline':
      return 'Offline · saved locally';
    case 'pending':
      return 'Pending sync';
    case 'error':
      return 'Sync error';
    default:
      return '';
  }
}

interface FooterProps {
  syncStatus: SyncStatus;
  syncEnabled: boolean;
}

export default function Footer({ syncStatus, syncEnabled }: FooterProps) {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 mt-12">
      <div className="max-w-6xl mx-auto px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-500">
        v{buildInfo.version} · {buildInfo.commit} · deployed {formatDeployTime(buildInfo.builtAt)}
        {syncEnabled && (
          <>
            {' '}
            ·{' '}
            <span
              className={
                syncStatus === 'error'
                  ? 'text-red-500'
                  : syncStatus === 'synced'
                    ? 'text-brand-700 dark:text-brand-400'
                    : syncStatus === 'pending' || syncStatus === 'offline'
                      ? 'text-amber-600 dark:text-amber-400'
                      : undefined
              }
            >
              {syncLabel(syncStatus)}
            </span>
          </>
        )}
      </div>
    </footer>
  );
}
