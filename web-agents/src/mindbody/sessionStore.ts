import type { BrowserContext } from 'playwright';
import pool from '../db';

export type StorageState = Awaited<ReturnType<BrowserContext['storageState']>>;

// Reuses a persisted, already-logged-in browser profile (cookies +
// localStorage) across booking runs instead of starting from a fresh,
// historyless session every time — a brand-new device/session with zero
// prior activity is itself a signal reCAPTCHA Enterprise's risk scoring
// weighs against a request, independent of anything about headless browsers
// specifically.
export async function loadSessionState(profile: string): Promise<StorageState | null> {
  const { rows } = await pool.query<{ storage_state: StorageState }>(
    'SELECT storage_state FROM web_agent_sessions WHERE profile = $1',
    [profile]
  );
  return rows[0]?.storage_state ?? null;
}

export async function saveSessionState(profile: string, state: StorageState): Promise<void> {
  await pool.query(
    `INSERT INTO web_agent_sessions (profile, storage_state, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (profile) DO UPDATE SET storage_state = $2, updated_at = now()`,
    [profile, JSON.stringify(state)]
  );
}
