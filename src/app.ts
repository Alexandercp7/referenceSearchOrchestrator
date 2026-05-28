import { Container, ContainerConfig, BuiltApp } from './infrastructure/container/Container';

export type { BuiltApp };

export interface AppConfig {
  jwtSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
  bcryptRounds: number;
  schedulerIntervalMs: number;
  cacheTtlSeconds: number;
}

export function buildApp(config: AppConfig): BuiltApp {
  const containerConfig: ContainerConfig = {
    jwtSecret: config.jwtSecret,
    accessTtl: config.jwtAccessTtl,
    refreshTtl: config.jwtRefreshTtl,
    schedulerIntervalMs: config.schedulerIntervalMs,
    cacheTtlSeconds: config.cacheTtlSeconds,
  };
  return Container.build(containerConfig);
}
