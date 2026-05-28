import { randomUUID } from 'node:crypto';
import { IdGenerator } from '../../domain/interfaces/gateways/IdGenerator';

export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
