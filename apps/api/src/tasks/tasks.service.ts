import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, Prisma, Role, StopStatus, Task, TaskApprovalStatus, TaskStatus } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { getTaskExecutionState } from '../planning/frozen-plan.helpers';
import { ManualPlanningService } from '../planning/manual-planning.service';
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
  'dropoffAddress',
  'dropoffLat',
  'dropoffLng',
  'priority',
  'notes',
] as const;

// R5.2.2: pickup window length is fixed (Time + 30 min) when the dispatcher
// supplies a single pickup time on the simplified form.
export const PICKUP_WINDOW_LENGTH_MINUTES = 30;

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

export type CadreDisplayStatus =
  | 'created'
  | 'approved'
  | 'rejected'
  | 'assigned'
  | 'started'
  | 'completed';

export type CadreTaskView = Task & {
  displayStatus: CadreDisplayStatus;
  assignedDriverName: string | null;
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly manualPlanningService: ManualPlanningService,
  ) {}

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

    if (query.priority) {
      where.priority = query.priority;
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

    // Hide rejected cadre tasks from the dispatcher's Task Management list.
    // Cadre still sees them in their "My Tasks" view via listMine().
    where.approvalStatus = { not: TaskApprovalStatus.rejected };

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { pickupWindowStart: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
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

  async create(dto: CreateTaskDto, currentUser?: AuthenticatedUser): Promise<Task> {
    const pickupWindowStart = new Date(dto.pickupWindowStart);
    if (Number.isNaN(pickupWindowStart.getTime())) {
      throw new BadRequestException('pickupWindowStart must be a valid datetime');
    }
    const pickupWindowEnd = this.derivePickupWindowEnd(pickupWindowStart);
    const pickupServiceMinutes = await this.getPickupServiceMinutesDefault();
    const isCadre = currentUser?.role === Role.CADRE;

    return this.prisma.task.create({
      data: {
        title: dto.title,
        pickupAddress: dto.pickupAddress,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        pickupWindowStart,
        pickupWindowEnd,
        pickupServiceMinutes,
        dropoffAddress: dto.dropoffAddress,
        dropoffLat: dto.dropoffLat,
        dropoffLng: dto.dropoffLng,
        priority: dto.priority ?? Priority.normal,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        createdById: currentUser?.id ?? null,
        approvalStatus: isCadre
          ? TaskApprovalStatus.pending_approval
          : TaskApprovalStatus.approved,
      },
    });
  }

  async listMine(currentUser: AuthenticatedUser): Promise<CadreTaskView[]> {
    const tasks = await this.prisma.task.findMany({
      where: { createdById: currentUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        stops: {
          orderBy: { sequence: 'asc' },
          select: {
            status: true,
            route: { select: { driver: { select: { name: true } } } },
          },
        },
      },
    });

    return tasks.map((task) => {
      const driverName = task.stops[0]?.route?.driver?.name ?? null;
      return {
        ...this.stripCadreInternals(task),
        displayStatus: this.deriveCadreDisplayStatus(task),
        assignedDriverName: driverName,
      };
    });
  }

  async cadreUpdate(
    id: string,
    dto: UpdateTaskDto,
    currentUser: AuthenticatedUser,
  ): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.createdById !== currentUser.id) {
      throw new ForbiddenException('You can only edit your own tasks');
    }
    if (task.approvalStatus === TaskApprovalStatus.approved) {
      throw new ConflictException('Approved tasks cannot be edited');
    }
    return this.update(id, dto);
  }

  async cadreRemove(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.createdById !== currentUser.id) {
      throw new ForbiddenException('You can only delete your own tasks');
    }
    if (task.approvalStatus === TaskApprovalStatus.approved) {
      throw new ConflictException('Approved tasks cannot be deleted');
    }
    await this.prisma.task.delete({ where: { id } });
  }

  async approve(id: string, currentUser: AuthenticatedUser): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.approvalStatus === TaskApprovalStatus.approved) return task;
    return this.prisma.task.update({
      where: { id },
      data: {
        approvalStatus: TaskApprovalStatus.approved,
        decidedAt: new Date(),
        decidedById: currentUser.id,
      },
    });
  }

  async reject(id: string, currentUser: AuthenticatedUser): Promise<Task> {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.approvalStatus === TaskApprovalStatus.approved) {
      throw new ConflictException('Cannot reject an already approved task');
    }
    return this.prisma.task.update({
      where: { id },
      data: {
        approvalStatus: TaskApprovalStatus.rejected,
        decidedAt: new Date(),
        decidedById: currentUser.id,
      },
    });
  }

  private deriveCadreDisplayStatus(task: {
    approvalStatus: TaskApprovalStatus;
    stops: { status: StopStatus }[];
  }): CadreDisplayStatus {
    if (task.approvalStatus === TaskApprovalStatus.pending_approval) return 'created';
    if (task.approvalStatus === TaskApprovalStatus.rejected) return 'rejected';
    if (task.stops.length === 0) return 'approved';
    const allDone = task.stops.every((s) => s.status === StopStatus.done);
    if (allDone) return 'completed';
    const anyStarted = task.stops.some(
      (s) => s.status === StopStatus.arrived || s.status === StopStatus.done,
    );
    if (anyStarted) return 'started';
    return 'assigned';
  }

  private stripCadreInternals<T extends { stops?: unknown }>(task: T): Omit<T, 'stops'> {
    const { stops: _stops, ...rest } = task;
    return rest;
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    if (dto.status !== undefined) {
      throw new BadRequestException('status cannot be updated via this endpoint');
    }

    const existing = await this.prisma.task.findUnique({
      where: { id },
      include: { stops: { select: { status: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    if (existing.status === TaskStatus.cancelled) {
      throw new BadRequestException('Cannot update a cancelled task');
    }

    // v1.1 R1.2 — frozen plan invariant: once any of the task's stops has
    // started, the dispatcher must not edit task fields. The cancellation
    // path (DELETE /tasks/:id) is governed separately and refined by R1.4.
    const executionState = getTaskExecutionState(
      { status: existing.status },
      existing.stops,
    );
    if (executionState === 'in_progress') {
      throw new ConflictException('Cannot update a task whose execution has started');
    }
    if (executionState === 'completed') {
      throw new ConflictException('Cannot update a completed task');
    }

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.pickupAddress !== undefined) data.pickupAddress = dto.pickupAddress;
    if (dto.pickupLat !== undefined) data.pickupLat = dto.pickupLat;
    if (dto.pickupLng !== undefined) data.pickupLng = dto.pickupLng;
    if (dto.pickupWindowStart !== undefined) {
      const pickupWindowStart = new Date(dto.pickupWindowStart);
      if (Number.isNaN(pickupWindowStart.getTime())) {
        throw new BadRequestException('pickupWindowStart must be a valid datetime');
      }
      data.pickupWindowStart = pickupWindowStart;
      data.pickupWindowEnd = this.derivePickupWindowEnd(pickupWindowStart);
    }
    if (dto.dropoffAddress !== undefined) data.dropoffAddress = dto.dropoffAddress;
    if (dto.dropoffLat !== undefined) data.dropoffLat = dto.dropoffLat;
    if (dto.dropoffLng !== undefined) data.dropoffLng = dto.dropoffLng;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() ? dto.notes.trim() : null;

    return this.prisma.task.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        stops: {
          select: { id: true, routeId: true, status: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Idempotent: re-cancelling a cancelled task is a silent no-op (v1).
    if (task.status === TaskStatus.cancelled) {
      return;
    }

    const executionState = getTaskExecutionState(
      { status: task.status },
      task.stops,
    );

    if (executionState === 'in_progress') {
      throw new ConflictException(
        'Cannot cancel a task whose execution has started',
      );
    }
    if (executionState === 'completed') {
      throw new ConflictException('Cannot cancel a completed task');
    }

    // pending / assigned: cancellable. For assigned tasks, mark each stop
    // as `skipped` (with no actualArrivalS, so the recalc treats them as
    // dispatcher-cancelled phantoms) and write StopEvent entries for audit.
    const affectedRouteIds = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id },
        data: { status: TaskStatus.cancelled },
      });

      for (const stop of task.stops) {
        await tx.stop.update({
          where: { id: stop.id },
          data: { status: StopStatus.skipped },
        });
        await tx.stopEvent.create({
          data: {
            stopId: stop.id,
            status: StopStatus.skipped,
            notes: 'Task cancelled by dispatcher',
            createdBy: currentUser.id,
          },
        });
        affectedRouteIds.add(stop.routeId);
      }
    });

    // Recompute downstream ETAs on each affected route. The R1.4-aware
    // recalc bypasses dispatcher-cancelled stops entirely.
    for (const routeId of affectedRouteIds) {
      await this.manualPlanningService.recalculateRouteForIncidents(routeId);
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
    const pickupServiceMinutes = await this.getPickupServiceMinutesDefault();

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

      const validation = this.validateImportRecord(record, rowNumber, pickupServiceMinutes);
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
    pickupServiceMinutes: number,
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

    const priority = this.parsePriority(record.priority, row, errors);
    const notes = record.notes?.trim() ? record.notes.trim() : null;

    if (
      errors.length > 0 ||
      !title ||
      !pickupAddress ||
      pickupLat === null ||
      pickupLng === null ||
      !pickupWindowStart ||
      !dropoffAddress ||
      dropoffLat === null ||
      dropoffLng === null ||
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
        pickupWindowEnd: this.derivePickupWindowEnd(pickupWindowStart),
        pickupServiceMinutes,
        dropoffAddress,
        dropoffLat,
        dropoffLng,
        priority,
        notes,
      },
    };
  }

  private derivePickupWindowEnd(pickupWindowStart: Date): Date {
    return new Date(pickupWindowStart.getTime() + PICKUP_WINDOW_LENGTH_MINUTES * 60_000);
  }

  private async getPickupServiceMinutesDefault(): Promise<number> {
    const config = await this.prisma.config.findUnique({ where: { id: 1 } });
    return config?.pickupServiceMinutesDefault ?? 20;
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
