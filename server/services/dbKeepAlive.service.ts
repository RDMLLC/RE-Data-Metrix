import { db } from '../db';
import { sql } from 'drizzle-orm';

const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes
const FAILURE_LOG_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

let inFlight = false;
let isFailing = false;
let lastFailureLoggedAt = 0;
let consecutiveFailures = 0;

async function ping() {
  if (inFlight) {
    scheduleNext();
    return;
  }
  inFlight = true;
  try {
    await db.execute(sql`SELECT 1`);
    if (isFailing) {
      console.log(
        `[dbKeepAlive] Recovered after ${consecutiveFailures} consecutive failure(s).`,
      );
    }
    isFailing = false;
    consecutiveFailures = 0;
    lastFailureLoggedAt = 0;
  } catch (err) {
    consecutiveFailures += 1;
    const now = Date.now();
    const shouldLog =
      !isFailing || now - lastFailureLoggedAt >= FAILURE_LOG_THROTTLE_MS;
    if (shouldLog) {
      console.warn(
        `[dbKeepAlive] Ping failed (consecutive=${consecutiveFailures}):`,
        err instanceof Error ? err.message : err,
      );
      lastFailureLoggedAt = now;
    }
    isFailing = true;
  } finally {
    inFlight = false;
    scheduleNext();
  }
}

function scheduleNext() {
  setTimeout(ping, KEEP_ALIVE_INTERVAL_MS);
}

export function startDbKeepAlive() {
  scheduleNext();
}
