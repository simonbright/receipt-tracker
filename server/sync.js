import { getSyncBackend, getSyncRecord, isSyncConfigured, putSyncRecord } from './db.js';

const DEFAULT_SYNC_KEY = 'default';

function resolveSyncKey(req) {
  const configured = process.env.SYNC_KEY;
  const provided = req.get('x-sync-key') || req.query.syncKey;

  if (configured) {
    if (provided !== configured) return null;
    return configured;
  }

  return provided || DEFAULT_SYNC_KEY;
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (!Array.isArray(payload.expenses)) return false;
  if (!payload.settings || typeof payload.settings !== 'object') return false;
  if (!Array.isArray(payload.reminders)) return false;
  if (typeof payload.updatedAt !== 'string') return false;
  return true;
}

export function setupSync(app) {
  app.get('/api/sync', async (req, res) => {
    try {
      if (!isSyncConfigured()) {
        return res.status(503).json({ error: 'Sync not available' });
      }

      const syncKey = resolveSyncKey(req);
      if (!syncKey) {
        return res.status(401).json({ error: 'Invalid sync key' });
      }

      const record = await getSyncRecord(syncKey);
      res.json({
        ok: true,
        backend: getSyncBackend(),
        payload: record?.payload ?? null,
        updatedAt: record?.updatedAt ?? null,
      });
    } catch (err) {
      console.error('Sync GET error:', err);
      res.status(500).json({ error: 'Failed to load sync data' });
    }
  });

  app.put('/api/sync', async (req, res) => {
    try {
      if (!isSyncConfigured()) {
        return res.status(503).json({ error: 'Sync not available' });
      }

      const syncKey = resolveSyncKey(req);
      if (!syncKey) {
        return res.status(401).json({ error: 'Invalid sync key' });
      }

      const { payload } = req.body || {};
      if (!validatePayload(payload)) {
        return res.status(400).json({ error: 'Invalid sync payload' });
      }

      const existing = await getSyncRecord(syncKey);
      if (existing && existing.updatedAt > payload.updatedAt) {
        return res.status(409).json({
          error: 'conflict',
          payload: existing.payload,
          updatedAt: existing.updatedAt,
        });
      }

      const saved = await putSyncRecord(syncKey, payload, payload.updatedAt);
      res.json({ ok: true, updatedAt: saved.updatedAt });
    } catch (err) {
      console.error('Sync PUT error:', err);
      res.status(500).json({ error: 'Failed to save sync data' });
    }
  });
}

export function isSyncKeyConfigured() {
  return Boolean(process.env.SYNC_KEY);
}
