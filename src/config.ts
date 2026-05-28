const NODE_ENV = process.env['NODE_ENV'] ?? 'development';
const isProd = NODE_ENV === 'production';

function str(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function num(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined) return defaultValue;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) throw new Error(`Env var ${key} must be a number, got: "${raw}"`);
  return parsed;
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var in production: ${key}`);
  return value;
}

export const config = {
  nodeEnv: NODE_ENV,
  port: num('PORT', 3000),
  jwtSecret: isProd ? required('JWT_SECRET') : str('JWT_SECRET', 'dev-secret-change-me'),
  jwtAccessTtl: str('JWT_ACCESS_TTL', '15m'),
  jwtRefreshTtl: str('JWT_REFRESH_TTL', '7d'),
  bcryptRounds: num('BCRYPT_ROUNDS', isProd ? 12 : 10),
  schedulerIntervalMs: num('SCHEDULER_INTERVAL_MS', 60_000),
  cacheTtlSeconds: num('CACHE_TTL_SECONDS', 300),
  smtp: {
    host: str('SMTP_HOST', ''),
    port: num('SMTP_PORT', 587),
    secure: (process.env['SMTP_SECURE'] ?? 'false') === 'true',
    user: str('SMTP_USER', ''),
    pass: str('SMTP_PASS', ''),
    from: str('SMTP_FROM', ''),
  },
  vapid: {
    publicKey: str('VAPID_PUBLIC_KEY', ''),
    privateKey: str('VAPID_PRIVATE_KEY', ''),
    subject: str('VAPID_SUBJECT', ''),
  },
} as const;
