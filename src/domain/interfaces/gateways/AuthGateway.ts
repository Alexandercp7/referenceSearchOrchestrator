export type { TokenPair, TokenPayload } from './TokenGateway';
export type { PasswordGateway } from './PasswordGateway';
export type { TokenGateway } from './TokenGateway';

import { PasswordGateway } from './PasswordGateway';
import { TokenGateway } from './TokenGateway';

export type AuthGateway = PasswordGateway & TokenGateway;
