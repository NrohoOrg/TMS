import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureE2eApp } from './setup-e2e';

describe('Optimize flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let createdTaskId: string | null = null;
  let createdPlanId: string | null = null;
  let createdJobId: string | null = null;

  const targetDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const isoAtUtc = (date: string, hour: number, minute: number): string => {
    const [year, month, day] = date.split('-').map((value) => Number(value));
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0)).toISOString();
  };

  beforeAll(async () => {
    process.env.DATABASE_URL ??= 'postgresql://dispatch:dispatch@localhost:5433/dispatch_dev';
    process.env.REDIS_URL ??= 'redis://localhost:6379';
    process.env.JWT_SECRET ??= 'changeme_jwt_secret_dev';
    process.env.ENABLE_OPTIMIZATION_WORKER_IN_TESTS = 'true';

    jest.spyOn(axios, 'post').mockImplementation(async (_url, payload: any) => {
      const driverId = payload.drivers[0]?.id;
      const taskId = payload.tasks[0]?.id;
      return {
        data: {
          jobId: payload.jobId,
          status: 'completed',
          routes: driverId && taskId
            ? [
                {
                  driverId,
                  stops: [
                    {
                      taskId,
                      type: 'pickup',
                      sequence: 1,
                      arrivalS: 32400,
                      departureS: 32700,
                    },
                    {
                      taskId,
                      type: 'dropoff',
                      sequence: 2,
                      arrivalS: 36000,
                      departureS: 36300,
                    },
                  ],
                  totalDistanceM: 4200,
                  totalTimeS: 3900,
                },
              ]
            : [],
          unassigned: [],
        },
      } as any;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureE2eApp(app);
    await app.init();

    prisma = new PrismaClient();
    await prisma.$connect();
  });

  afterAll(async () => {
    if (createdJobId) {
      await prisma.optimizationJob.delete({ where: { id: createdJobId } });
    }

    if (createdPlanId) {
      await prisma.stop.deleteMany({ where: { route: { planId: createdPlanId } } });
      await prisma.route.deleteMany({ where: { planId: createdPlanId } });
      await prisma.plan.delete({ where: { id: createdPlanId } });
    }

    if (createdTaskId) {
      await prisma.task.delete({ where: { id: createdTaskId } });
    }

    jest.restoreAllMocks();
    process.env.ENABLE_OPTIMIZATION_WORKER_IN_TESTS = 'false';
    await prisma.$disconnect();
    await app.close();
  });

  it('runs login -> create task -> optimize -> status -> plan details', async () => {
    const loginResponse = await request(app.getHttpServer()).post('/api/auth/login').send({
      email: 'dispatcher@example.com',
      password: 'Dispatch1234!',
    });
    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.data.token).toBeDefined();

    const accessToken = loginResponse.body.data.token as string;

    const taskResponse = await request(app.getHttpServer())
      .post('/api/dispatcher/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'E2E Task',
        pickupAddress: 'Pickup E2E',
        pickupLat: 36.75,
        pickupLng: 3.05,
        pickupWindowStart: isoAtUtc(targetDate, 9, 0),
        pickupWindowEnd: isoAtUtc(targetDate, 10, 0),
        pickupServiceMinutes: 5,
        dropoffAddress: 'Dropoff E2E',
        dropoffLat: 36.8,
        dropoffLng: 3.1,
        dropoffDeadline: isoAtUtc(targetDate, 12, 0),
        dropoffServiceMinutes: 5,
        priority: 'normal',
      });

    expect(taskResponse.status).toBe(201);
    createdTaskId = taskResponse.body.data.id;

    const optimizeResponse = await request(app.getHttpServer())
      .post('/api/dispatcher/planning/optimize')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ date: targetDate, returnToDepot: false });

    expect(optimizeResponse.status).toBe(201);
    createdJobId = optimizeResponse.body.data.jobId;
    expect(createdJobId).toBeDefined();

    const timeoutAt = Date.now() + 15_000;
    while (Date.now() < timeoutAt) {
      const statusResponse = await request(app.getHttpServer())
        .get(`/api/dispatcher/planning/status/${createdJobId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(statusResponse.status).toBe(200);

      if (statusResponse.body.data.status === 'completed') {
        createdPlanId = statusResponse.body.data.planId;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    expect(createdPlanId).toBeDefined();

    const planResponse = await request(app.getHttpServer())
      .get(`/api/dispatcher/planning/plans/${createdPlanId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(planResponse.status).toBe(200);
    expect(planResponse.body.data.routes.length).toBeGreaterThanOrEqual(1);
    expect(planResponse.body.data.routes[0].stops.length).toBeGreaterThanOrEqual(2);
    expect(planResponse.body.data.unassigned.length).toBe(0);
  });
});
