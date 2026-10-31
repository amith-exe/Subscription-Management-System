import { Role } from '@prisma/client';
export interface AuthenticatedUser { id: string; email: string; role: Role; customerId: string | null; mustChangePassword: boolean; }
export interface RefreshClaims { sub: string; jti: string; familyId: string; type: 'refresh'; }
