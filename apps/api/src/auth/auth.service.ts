import { BadRequestException, UnauthorizedException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  type: 'access';
};

type RefreshTokenPayload = {
  sub: string;
  type: 'refresh';
};

type TokenPair = {
  token: string;
  refreshToken: string;
  refreshExpiresAt: Date;
};

type LoginUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  phone: string | null;
  avatar: string | null;
  expiresIn: number;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly accessExpiresIn: string;
  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    configService: ConfigService,
  ) {
    this.jwtSecret = configService.get<string>('JWT_SECRET') ?? 'dev-secret';
    this.accessExpiresIn = configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    this.accessExpiresInSeconds = this.parseDurationToSeconds(this.accessExpiresIn);
    this.refreshExpiresIn = configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
  }

  async login(
    dto: LoginDto,
  ): Promise<{ token: string; refreshToken: string; user: LoginUser }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const isPasswordValid = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
      },
    });

    const { token, refreshToken, refreshExpiresAt } = await this.issueTokens(updatedUser);
    await this.storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

    return {
      token,
      refreshToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        avatar: null,
        expiresIn: this.accessExpiresInSeconds,
      },
    };
  }

  async refresh(dto: RefreshDto): Promise<{ token: string; refreshToken: string }> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken || storedToken.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: storedToken.userId } });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const { token, refreshToken, refreshExpiresAt } = await this.issueTokens(user);
    await this.storeRefreshToken(user.id, refreshToken, refreshExpiresAt);

    return { token, refreshToken };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must differ from the current password');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated successfully' };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.jwtSecret,
      });

      if (payload.type !== 'refresh' || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async issueTokens(user: Pick<User, 'id' | 'email' | 'role'>): Promise<TokenPair> {
    const token = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
      } as AccessTokenPayload,
      {
        secret: this.jwtSecret,
        expiresIn: this.accessExpiresIn,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        type: 'refresh',
      } as RefreshTokenPayload,
      {
        secret: this.jwtSecret,
        expiresIn: this.refreshExpiresIn,
      },
    );

    const decodedToken = this.jwt.decode(refreshToken) as { exp?: number } | null;

    if (!decodedToken || typeof decodedToken.exp !== 'number') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return {
      token,
      refreshToken,
      refreshExpiresAt: new Date(decodedToken.exp * 1000),
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationToSeconds(duration: string): number {
    const normalized = duration.trim().toLowerCase();
    const match = /^(\d+)([smhd])?$/.exec(normalized);
    if (!match) {
      return 15 * 60;
    }

    const value = Number(match[1]);
    const unit = match[2] ?? 's';
    const multiplier =
      unit === 'd' ? 24 * 60 * 60 : unit === 'h' ? 60 * 60 : unit === 'm' ? 60 : 1;
    return value * multiplier;
  }
}
