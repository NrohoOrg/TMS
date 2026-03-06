import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, Prisma, Task, TaskStatus } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

export const TASK_IMPORT_HEADERS = [
  'title',
  'pickupAddress',
  'pickupLat',
  'pickupLng',
  'pickupWindowStart',
  'pickupWindowEnd',
  'pickupServiceMinutes',
  'dropoffAddress',
  'dropoffLat',
  'dropoffLng',
  'dropoffDeadline',
  'dropoffServiceMinutes',
  'priority',
  'notes',
] as const;

export type TaskImportError = {
  row: number;
  field: string;
  message: string;
};

export type TaskImportResult = {
  imported: number;
  errors: TaskImportError[];
};

export type TaskListResult = {
  items: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async findAll(query: ListTasksDto): Promise<TaskListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TaskWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    const pickupWindowStartFilter: Prisma.DateTimeFilter = {};
    if (query.dateFrom) {
      pickupWindowStartFilter.gte = this.toDateStart(query.dateFrom);
    }
    if (query.dateTo) {
      pickupWindowStartFilter.lte = this.toDateEnd(query.dateTo);
    }
    if (pickupWindowStartFilter.gte || pickupWindowStartFilter.lte) {
      where.pickupWindowStart = pickupWindowStartFilter;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { pickupAddress: { contains: query.search, mode: 'insensitive' } },
        { dropoffAddress: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { pickupWindowStart: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    const pickupWindowStart = new Date(dto.pickupWindowStart);
    const pickupWindowEnd = new Date(dto.pickupWindowEnd);
    const dropoffDeadline = new Date(dto.dropoffDeadline);
    this.validateWindowOrdering(pickupWindowStart, pickupWindowEnd, dropoffDeadline);

    return this.prisma.task.create({
      data: {
        title: dto.title,
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        pickupWindowStart,
        pickupWindowEnd,
        pickupServiceMinutes: dto.pickupServiceMinutes ?? 0,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        dropoffDeadline,
        dropoffServiceMinutes: dto.dropoffServiceMinutes ?? 0,
        priority: dto.priority ?? Priority.normal,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
      },
    });
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    if (dto.status !== undefined) {
      throw new BadRequestException('status cannot be updated via this endpoint');
    }

    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    if (existing.status === TaskStatus.cancelled) {
      throw new BadRequestException('Cannot update a cancelled task');
    }

    const pickupWindowStart = dto.pickupWindowStart
      ? new Date(dto.pickupWindowStart)
      : existing.pickupWindowStart;
    const pickupWindowEnd = dto.pickupWindowEnd ? new Date(dto.pickupWindowEnd) : existing.pickupWindowEnd;
    const dropoffDeadline = dto.dropoffDeadline ? new Date(dto.dropoffDeadline) : existing.dropoffDeadline;
    this.validateWindowOrdering(pickupWindowStart, pickupWindowEnd, dropoffDeadline);

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.pickupAddress !== undefined) data.pickupAddress = dto.pickupAddress;
    if (dto.pickupLat !== undefined) data.pickupLat = dto.pickupLat;
    if (dto.pickupLng !== undefined) data.pickupLng = dto.pickupLng;
    if (dto.pickupWindowStart !== undefined) data.pickupWindowStart = pickupWindowStart;
    if (dto.pickupWindowEnd !== undefined) data.pickupWindowEnd = pickupWindowEnd;
    if (dto.pickupServiceMinutes !== undefined) data.pickupServiceMinutes = dto.pickupServiceMinutes;
    if (dto.dropoffAddress !== undefined) data.dropoffAddress = dto.dropoffAddress;
    if (dto.dropoffLat !== undefined) data.dropoffLat = dto.dropoffLat;
    if (dto.dropoffLng !== undefined) data.dropoffLng = dto.dropoffLng;
    if (dto.dropoffDeadline !== undefined) data.dropoffDeadline = dropoffDeadline;
    if (dto.dropoffServiceMinutes !== undefined) data.dropoffServiceMinutes = dto.dropoffServiceMinutes;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() ? dto.notes.trim() : null;

    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.status === TaskStatus.assigned) {
      throw new ConflictException('Cannot cancel an assigned task');
    }

    if (task.status !== TaskStatus.cancelled) {
      await this.prisma.task.update({
        where: { id },
        data: { status: TaskStatus.cancelled },
      });
    }
  }

  async importFromCsv(file: Express.Multer.File): Promise<TaskImportResult> {
    if (!file) {
      return {
        imported: 0,
        errors: [{ row: 0, field: 'file', message: 'CSV file is required' }],
      };
    }

    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      return {
        imported: 0,
        errors: [{ row: 0, field: 'file', message: 'Only CSV files are allowed' }],
      };
    }

    let records: string[][];
    try {
      records = parse(file.buffer.toString('utf8'), {
        bom: true,
        skip_empty_lines: true,
        relax_column_count: true,
      }) as string[][];
    } catch {
      return {
        imported: 0,
        errors: [{ row: 0, field: 'file', message: 'Invalid CSV content' }],
      };
    }

    if (records.length === 0) {
      return {
        imported: 0,
        errors: [{ row: 0, field: 'file', message: 'CSV file is empty' }],
      };
    }

    const headers = records[0].map((value) => `${value ?? ''}`);
    if (!this.hasExactImportHeaders(headers)) {
      return {
        imported: 0,
        errors: [
          {
            row: 1,
            field: 'headers',
            message: `Headers must exactly be: ${TASK_IMPORT_HEADERS.join(', ')}`,
          },
        ],
      };
    }

    const dataRows = records.slice(1);
    if (dataRows.length > 500) {
      return {
        imported: 0,
        errors: [{ row: 0, field: 'file', message: 'CSV row limit is 500' }],
      };
    }

    const errors: TaskImportError[] = [];
    const validRows: Prisma.TaskCreateInput[] = [];

    dataRows.forEach((row, index) => {
      const rowNumber = index + 2;
      const normalizedRow = row.map((value) => `${value ?? ''}`.trim());
      if (normalizedRow.length !== TASK_IMPORT_HEADERS.length) {
        errors.push({
          row: rowNumber,
          field: 'row',
          message: `Expected ${TASK_IMPORT_HEADERS.length} columns`,
        });
        return;
      }

      const record = TASK_IMPORT_HEADERS.reduce<Record<string, string>>((acc, header, headerIndex) => {
        acc[header] = normalizedRow[headerIndex] ?? '';
        return acc;
      }, {});

      const validation = this.validateImportRecord(record, rowNumber);
      if (validation.errors.length > 0) {
        errors.push(...validation.errors);
        return;
      }

      if (validation.data) {
        validRows.push(validation.data);
      }
    });

    if (errors.length > 0) {
      return { imported: 0, errors };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        await tx.task.create({ data: row });
      }
    });

    return { imported: validRows.length, errors: [] };
  }

  private hasExactImportHeaders(headers: string[]): boolean {
    return (
      headers.length === TASK_IMPORT_HEADERS.length &&
      TASK_IMPORT_HEADERS.every((header, index) => headers[index] === header)
    );
  }

  private validateImportRecord(
    record: Record<string, string>,
    row: number,
  ): {
    data?: Prisma.TaskCreateInput;
    errors: TaskImportError[];
  } {
    const errors: TaskImportError[] = [];

    const title = this.requireText(record.title, row, 'title', errors);
    const pickupAddress = this.requireText(record.pickupAddress, row, 'pickupAddress', errors);
    const dropoffAddress = this.requireText(record.dropoffAddress, row, 'dropoffAddress', errors);

    const pickupLat = this.parseFloatRange(record.pickupLat, row, 'pickupLat', -90, 90, errors);
    const pickupLng = this.parseFloatRange(record.pickupLng, row, 'pickupLng', -180, 180, errors);
    const dropoffLat = this.parseFloatRange(record.dropoffLat, row, 'dropoffLat', -90, 90, errors);
    const dropoffLng = this.parseFloatRange(record.dropoffLng, row, 'dropoffLng', -180, 180, errors);

    const pickupWindowStart = this.parseDateTime(record.pickupWindowStart, row, 'pickupWindowStart', errors);
    const pickupWindowEnd = this.parseDateTime(record.pickupWindowEnd, row, 'pickupWindowEnd', errors);
    const dropoffDeadline = this.parseDateTime(record.dropoffDeadline, row, 'dropoffDeadline', errors);

    const pickupServiceMinutes = this.parseIntMin(
      record.pickupServiceMinutes,
      row,
      'pickupServiceMinutes',
      0,
      errors,
    );
    const dropoffServiceMinutes = this.parseIntMin(
      record.dropoffServiceMinutes,
      row,
      'dropoffServiceMinutes',
      0,
      errors,
    );

    const priority = this.parsePriority(record.priority, row, errors);
    const notes = record.notes?.trim() ? record.notes.trim() : null;

    if (pickupWindowStart && pickupWindowEnd && dropoffDeadline) {
      if (pickupWindowStart >= pickupWindowEnd) {
        errors.push({
          row,
          field: 'pickupWindowEnd',
          message: 'pickupWindowStart must be earlier than pickupWindowEnd',
        });
      }
      if (pickupWindowEnd >= dropoffDeadline) {
        errors.push({
          row,
          field: 'dropoffDeadline',
          message: 'pickupWindowEnd must be earlier than dropoffDeadline',
        });
      }
    }

    if (
      errors.length > 0 ||
      !title ||
      !pickupAddress ||
      pickupLat === null ||
      pickupLng === null ||
      !pickupWindowStart ||
      !pickupWindowEnd ||
      pickupServiceMinutes === null ||
      !dropoffAddress ||
      dropoffLat === null ||
      dropoffLng === null ||
      !dropoffDeadline ||
      dropoffServiceMinutes === null ||
      !priority
    ) {
      return { errors };
    }

    return {
      errors,
      data: {
        title,
        pickupAddress,
        pickupLat,
        pickupLng,
        pickupWindowStart,
        pickupWindowEnd,
        pickupServiceMinutes,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        dropoffDeadline,
        dropoffServiceMinutes,
        priority,
        notes,
      },
    };
  }

  private validateWindowOrdering(
    pickupWindowStart: Date,
    pickupWindowEnd: Date,
    dropoffDeadline: Date,
  ): void {
    if (pickupWindowStart >= pickupWindowEnd) {
      throw new BadRequestException('pickupWindowStart must be earlier than pickupWindowEnd');
    }
    if (pickupWindowEnd >= dropoffDeadline) {
      throw new BadRequestException('pickupWindowEnd must be earlier than dropoffDeadline');
    }
  }

  private toDateStart(value: string): Date {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('dateFrom must be a valid date');
    }
    return date;
  }

  private toDateEnd(value: string): Date {
    const date = new Date(`${value}T23:59:59.999Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('dateTo must be a valid date');
    }
    return date;
  }

  private requireText(
    value: string,
    row: number,
    field: string,
    errors: TaskImportError[],
  ): string | null {
    if (!value || value.trim().length === 0) {
      errors.push({ row, field, message: `${field} is required` });
      return null;
    }
    return value.trim();
  }

  private parseFloatRange(
    value: string,
    row: number,
    field: string,
    min: number,
    max: number,
    errors: TaskImportError[],
  ): number | null {
    if (!value || value.length === 0) {
      errors.push({ row, field, message: `${field} is required` });
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      errors.push({ row, field, message: `${field} must be a number` });
      return null;
    }
    if (parsed < min || parsed > max) {
      errors.push({ row, field, message: `${field} must be between ${min} and ${max}` });
      return null;
    }
    return parsed;
  }

  private parseIntMin(
    value: string,
    row: number,
    field: string,
    min: number,
    errors: TaskImportError[],
  ): number | null {
    if (!value || value.length === 0) {
      errors.push({ row, field, message: `${field} is required` });
      return null;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed)) {
      errors.push({ row, field, message: `${field} must be an integer` });
      return null;
    }

    if (parsed < min) {
      errors.push({ row, field, message: `${field} must be >= ${min}` });
      return null;
    }

    return parsed;
  }

  private parseDateTime(
    value: string,
    row: number,
    field: string,
    errors: TaskImportError[],
  ): Date | null {
    if (!value || value.length === 0) {
      errors.push({ row, field, message: `${field} is required` });
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ row, field, message: `${field} must be a valid ISO datetime` });
      return null;
    }

    return parsed;
  }

  private parsePriority(value: string, row: number, errors: TaskImportError[]): Priority | null {
    if (!value || value.length === 0) {
      errors.push({ row, field: 'priority', message: 'priority is required' });
      return null;
    }

    if (!Object.values(Priority).includes(value as Priority)) {
      errors.push({
        row,
        field: 'priority',
        message: `priority must be one of: ${Object.values(Priority).join(', ')}`,
      });
      return null;
    }

    return value as Priority;
  }
}
