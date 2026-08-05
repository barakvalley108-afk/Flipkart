type Attempt = { count: number; resetAt: number; blockedUntil?: number };

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function cleanup(now: number) {
  if (attempts.size < 500) return;
  for (const [key, value] of attempts) {
    if ((value.blockedUntil ?? value.resetAt) < now) attempts.delete(key);
  }
}

export function checkLoginLimit(key: string) {
  const now = Date.now();
  cleanup(now);
  const attempt = attempts.get(key);
  if (!attempt) return { allowed: true, retryAfterSeconds: 0 };
  if (attempt.blockedUntil && attempt.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((attempt.blockedUntil - now) / 1000) };
  }
  if (attempt.resetAt <= now) attempts.delete(key);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string) {
  const now = Date.now();
  const previous = attempts.get(key);
  const attempt = !previous || previous.resetAt <= now
    ? { count: 1, resetAt: now + WINDOW_MS }
    : { ...previous, count: previous.count + 1 };
  if (attempt.count >= MAX_ATTEMPTS) attempt.blockedUntil = now + BLOCK_MS;
  attempts.set(key, attempt);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
