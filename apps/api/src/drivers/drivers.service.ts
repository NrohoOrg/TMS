import { Injectable, NotFoundException } from '@nestjs/common';
import { Driver, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Injectable()
export class DriversService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateDriverDto): Promise<Driver> {
    return this.prisma.driver.create({ data: dto });
  }

  async update(id: string, dto: UpdateDriverDto): Promise<Driver> {
    try {
      return await this.prisma.driver.update({
        where: { id },
        data: dto,
      });
    } catch (error) {
      this.rethrowIfNotFound(error, 'Driver not found');
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.driver.update({
        where: { id },
        data: { active: false },
      });
    } catch (error) {
      this.rethrowIfNotFound(error, 'Driver not found');
      throw error;
    }
  }

  private rethrowIfNotFound(error: unknown, message: string): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(message);
    }
  }
}
