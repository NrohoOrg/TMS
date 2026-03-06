import { Availability } from '@prisma/client';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

export type AvailabilityWithSyntheticDefaults = Omit<Availability, 'id'> & {
  id?: string;
};

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(date?: string): Promise<AvailabilityWithSyntheticDefaults[]> {
    const targetDate = this.parseDate(date);
    const activeDrivers = await this.prisma.driver.findMany({
      where: { active: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (activeDrivers.length === 0) {
      return [];
    }

    const existing = await this.prisma.availability.findMany({
      where: {
        date: targetDate,
        driverId: { in: activeDrivers.map((driver) => driver.id) },
      },
    });
    const existingByDriverId = new Map(existing.map((row) => [row.driverId, row]));

    return activeDrivers.map((driver) => {
      const row = existingByDriverId.get(driver.id);
      if (row) {
        return row;
      }

      return {
        driverId: driver.id,
        date: targetDate,
        available: true,
        shiftStartOverride: null,
        shiftEndOverride: null,
      };
    });
  }

  async upsert(driverId: string, dto: UpdateAvailabilityDto): Promise<Availability> {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, active: true },
      select: { id: true },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    if (
      dto.shiftStartOverride &&
      dto.shiftEndOverride &&
      dto.shiftStartOverride >= dto.shiftEndOverride
    ) {
      throw new BadRequestException('shiftStartOverride must be earlier than shiftEndOverride');
    }

    const date = this.parseDate(dto.date);
    const payload = {
      available: dto.available,
      shiftStartOverride: dto.shiftStartOverride ?? null,
      shiftEndOverride: dto.shiftEndOverride ?? null,
    };

    return this.prisma.availability.upsert({
      where: {
        driverId_date: {
          driverId,
          date,
        },
      },
      update: payload,
      create: {
        driverId,
        date,
        ...payload,
      },
    });
  }

  private parseDate(value?: string): Date {
    const dateValue = value ?? this.todayDateString();
    const parsed = new Date(`${dateValue}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD value');
    }
    return parsed;
  }

  private todayDateString(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(
      now.getUTCDate(),
    ).padStart(2, '0')}`;
  }
}
