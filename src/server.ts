import { buildApp } from './app';
import { config } from './config';

const { app, scheduler } = buildApp(config);

const server = app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://localhost:${config.port}`);
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
