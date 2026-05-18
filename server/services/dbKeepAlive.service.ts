import { db } from '../db';
import { sql } from 'drizzle-orm';

const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export function startDbKeepAlive() {
  setInterval(async () => {
    try {
      await db.execute(sql`SELECT 1`);
    } catch (err) {
      // Silent fail — keep-alive is best-effort
    }
  }, KEEP_ALIVE_INTERVAL_MS);
}
