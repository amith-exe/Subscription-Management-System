import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

describe('AuthService refresh rotation', () => {
  const raw = 'refresh-token';
  const tokenHash = createHash('sha256').update(raw).digest('hex');
  const user = { id: 'user-1', email: 'user@example.com', role: Role.CUSTOMER, mustChangePassword: false, isActive: true, customer: { id: 'customer-1' } };
  let service: AuthService;
  let prisma: any;
  let tx: any;
  let response: any;

  beforeEach(() => {
    tx = { refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), create: jest.fn().mockResolvedValue({ id: 'new-refresh' }), update: jest.fn() } };
    prisma = {
      refreshToken: { findUnique: jest.fn().mockResolvedValue({ id: 'old-refresh', userId: user.id, familyId: 'family-1', expiresAt: new Date(Date.now() + 60000), revokedAt: null, user }), updateMany: jest.fn() },
      $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    service = new AuthService(
      prisma as never,
      { signAsync: jest.fn().mockResolvedValue('access-token') } as never,
      { getOrThrow: jest.fn().mockReturnValue('access-secret'), get: jest.fn().mockReturnValue('development') } as never,
      {} as never,
      { log: jest.fn() } as never,
    );
    response = { cookie: jest.fn() };
  });

  it('uses indexed hash lookup and commits rotation with the replacement token atomically', async () => {
    await service.refresh(raw, response, 'agent', '127.0.0.1');
    expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash } }));
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'old-refresh', revokedAt: null }) }));
    expect(tx.refreshToken.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ familyId: 'family-1', userAgent: 'agent', ip: '127.0.0.1' }) }));
    expect(tx.refreshToken.update).toHaveBeenCalledWith({ where: { id: 'old-refresh' }, data: { replacedById: 'new-refresh' } });
    expect(response.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.objectContaining({ httpOnly: true }));
  });

  it('revokes a token family when a rotation race loses or an old token is replayed', async () => {
    tx.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.refresh(raw, response)).rejects.toThrow(UnauthorizedException);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'family-1', revokedAt: null } }));
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
  });
});
