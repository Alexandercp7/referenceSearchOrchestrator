import { buildApp } from './app';

const PORT = Number(process.env.PORT ?? 3000);
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const SCHEDULER_INTERVAL_MS = Number(process.env.SCHEDULER_INTERVAL_MS ?? 60_000);

const { app, scheduler } = buildApp({
  jwtSecret: JWT_SECRET,
  schedulerIntervalMs: SCHEDULER_INTERVAL_MS,
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${PORT}`);
  scheduler.start();
});

function shutdown(): void {
  // eslint-disable-next-line no-console
  console.log('[server] shutting down...');
  scheduler.stop();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
