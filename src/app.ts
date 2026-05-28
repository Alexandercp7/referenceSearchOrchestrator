import { Container, ContainerConfig, BuiltApp } from './infrastructure/container/Container';

export type { BuiltApp };

export interface AppConfig {
  jwtSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  bcryptRounds: number;
  schedulerIntervalMs: number;
  cacheTtlSeconds: number;
  smtp: { host: string; port: number; secure: boolean; user: string; pass: string; from: string };
  vapid: { publicKey: string; privateKey: string; subject: string };
}

export function buildApp(config: AppConfig): BuiltApp {
  const containerConfig: ContainerConfig = {
    jwtSecret: config.jwtSecret,
    accessTtl: config.jwtAccessTtl,
    refreshTtl: config.jwtRefreshTtl,
    bcryptRounds: config.bcryptRounds,
    schedulerIntervalMs: config.schedulerIntervalMs,
    cacheTtlSeconds: config.cacheTtlSeconds,
    smtp: config.smtp.host ? config.smtp : undefined,
    vapid: config.vapid.publicKey ? config.vapid : undefined,
  };
  return Container.build(containerConfig);
}
