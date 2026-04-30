import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Config as PlannerConfig, Prisma, Role } from '@prisma/client';
import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { UpdateUserDto } from './dto/update-user.dto';

type ServiceStatus = 'ok' | 'error';

export type AdminHealthResponse = {
  status: 'ok' | 'degraded';
  services: {
    db: ServiceStatus;
    redis: ServiceStatus;
    optimizer: ServiceStatus;
  };
};

export type AdminUserResponse = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  phone: string | null;
  lastLogin: Date | null;
  createdAt: Date;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async health(): Promise<AdminHealthResponse> {
    const [dbOk, redisOk, optimizerOk] = await Promise.all([
      this.checkDb(),
      this.checkRedis(),
      this.checkOptimizer(),
    ]);

    const services: AdminHealthResponse['services'] = {
      db: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      optimizer: optimizerOk ? 'ok' : 'error',
    };

    const status = Object.values(services).every((serviceStatus) => serviceStatus === 'ok')
      ? 'ok'
      : 'degraded';

    return {
      status,
      services,
    };
  }

  getConfig(): Promise<PlannerConfig> {
    return this.prisma.config.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async updateConfig(dto: UpdateConfigDto): Promise<PlannerConfig> {
    const updateData: Prisma.ConfigUpdateInput = {};
    if (dto.maxSolveSeconds !== undefined) {
      updateData.maxSolveSeconds = dto.maxSolveSeconds;
    }
    if (dto.speedKmh !== undefined) {
      updateData.speedKmh = dto.speedKmh;
    }
    if (dto.objectiveWeights !== undefined) {
      updateData.objectiveWeights = dto.objectiveWeights as Prisma.InputJsonValue;
    }
    if (dto.smsEnabled !== undefined) {
      updateData.smsEnabled = dto.smsEnabled;
    }

    const createData: Prisma.ConfigCreateInput = {
      id: 1,
      ...(dto.maxSolveSeconds !== undefined ? { maxSolveSeconds: dto.maxSolveSeconds } : {}),
      ...(dto.speedKmh !== undefined ? { speedKmh: dto.speedKmh } : {}),
      ...(dto.objectiveWeights !== undefined
        ? { objectiveWeights: dto.objectiveWeights as Prisma.InputJsonValue }
        : {}),
      ...(dto.smsEnabled !== undefined ? { smsEnabled: dto.smsEnabled } : {}),
    };

    return this.prisma.config.upsert({
      where: { id: 1 },
      update: updateData,
      create: createData,
    });
  }

  listUsers(): Promise<AdminUserResponse[]> {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  async createUser(dto: CreateUserDto): Promise<AdminUserResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    return this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<AdminUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.email !== undefined) {
      data.email = dto.email.trim().toLowerCase();
    }
    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim().length > 0 ? dto.phone.trim() : null;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const referencedJobs = await this.prisma.optimizationJob.count({
      where: { createdById: id },
    });
    if (referencedJobs > 0) {
      throw new ConflictException('User has optimization jobs and cannot be deleted');
    }

    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });
    await this.prisma.user.delete({
      where: { id },
    });
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return (await this.redisService.getClient().ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  private async checkOptimizer(): Promise<boolean> {
    const optimizerBaseUrl = (this.configService.get<string>('OPTIMIZER_URL') ?? 'http://optimizer:8000')
      .replace(/\/$/, '');

    try {
      const response = await axios.get(`${optimizerBaseUrl}/health`, { timeout: 3000 });
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }
}
