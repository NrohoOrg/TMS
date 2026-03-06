import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const jwt = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
    decode: jest.fn(),
  };

  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };

      return values[key];
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as any,
      jwt as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  it('sets lastLogin and returns token response on login', async () => {
    const password = 'Dispatch1234!';
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'dispatcher@example.com',
      passwordHash: await bcrypt.hash(password, 10),
      role: Role.DISPATCHER,
    });
    prisma.user.update.mockResolvedValue({
      id: 'u1',
      name: 'Dispatcher User',
      email: 'dispatcher@example.com',
      role: Role.DISPATCHER,
      phone: null,
    });
    jwt.signAsync.mockResolvedValueOnce('new-access-token').mockResolvedValueOnce('new-refresh-token');
    jwt.decode.mockReturnValue({ exp: 2_000_000_100 });

    const out = await service.login({ email: 'dispatcher@example.com', password });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { lastLogin: expect.any(Date) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
    });
    expect(out).toEqual({
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: 'u1',
        name: 'Dispatcher User',
        email: 'dispatcher@example.com',
        role: Role.DISPATCHER,
        phone: null,
        avatar: null,
        expiresIn: 900,
      },
    });
  });

  it('rotates refresh tokens', async () => {
    prisma.refreshToken.findFirst.mockResolvedValue({
      id: 'rt-old',
      userId: 'u1',
      tokenHash: createHash('sha256').update('old-refresh-token').digest('hex'),
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      revokedAt: null,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'dispatcher@example.com',
      passwordHash: 'hash',
      role: Role.DISPATCHER,
    });
    jwt.verifyAsync.mockResolvedValue({
      sub: 'u1',
      type: 'refresh',
      exp: 2_000_000_000,
    });
    jwt.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    jwt.decode.mockReturnValue({ exp: 2_000_000_100 });

    const out = await service.refresh({ refreshToken: 'old-refresh-token' });

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-old' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        tokenHash: createHash('sha256').update('new-refresh-token').digest('hex'),
        expiresAt: new Date(2_000_000_100 * 1000),
      },
    });
    expect(out).toEqual({
      token: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });
});
