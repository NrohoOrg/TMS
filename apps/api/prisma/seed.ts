import { PrismaClient, Role, Priority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = (password: string) => bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      name: 'Admin User',
    },
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash: await hash('Admin1234!'),
      role: Role.ADMIN,
    },
  });
  await prisma.user.upsert({
    where: { email: 'dispatcher@example.com' },
    update: {
      name: 'Dispatcher User',
    },
    create: {
      email: 'dispatcher@example.com',
      name: 'Dispatcher User',
      passwordHash: await hash('Dispatch1234!'),
      role: Role.DISPATCHER,
    },
  });

  if ((await prisma.driver.count()) === 0) {
    const depotLat = 36.7372;
    const depotLng = 3.0865;
    await prisma.driver.createMany({
      data: [
        { name: 'Driver One', phone: '+213555000001', shiftStart: '08:00', shiftEnd: '17:00', depotLat, depotLng, active: true },
        { name: 'Driver Two', phone: '+213555000002', shiftStart: '08:00', shiftEnd: '17:00', depotLat, depotLng, active: true },
        { name: 'Driver Three', phone: '+213555000003', shiftStart: '08:00', shiftEnd: '17:00', depotLat, depotLng, active: true },
      ],
    });
  }

  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      maxSolveSeconds: 30,
      speedKmh: 40,
      objectiveWeights: { urgent: 1000, high: 500, normal: 100, low: 10 },
    },
  });

  if ((await prisma.task.count()) === 0) {
    const baseDate = new Date('2026-01-15T00:00:00.000Z');
    const priorities = [Priority.low, Priority.normal, Priority.normal, Priority.high, Priority.urgent] as const;
    const tasks = Array.from({ length: 10 }, (_, i) => {
      const pickupLat = 36.6972 + i * 0.009;
      const pickupLng = 3.0465 + (i % 5) * 0.014;
      const dropoffLat = 36.7122 + (i % 4) * 0.011;
      const dropoffLng = 3.0615 + i * 0.008;
      const start = new Date(baseDate);
      start.setHours(8 + i % 6, 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 2, 0, 0, 0);
      const deadline = new Date(end);
      deadline.setHours(deadline.getHours() + 1, 0, 0, 0);
      return {
        title: `Task ${i + 1}`,
        pickupAddress: `Pickup ${i + 1}, Algiers`,
        pickupLat,
        pickupLng,
        pickupWindowStart: start,
        pickupWindowEnd: end,
        pickupServiceMinutes: 0,
        dropoffAddress: `Dropoff ${i + 1}, Algiers`,
        dropoffLat,
        dropoffLng,
        dropoffDeadline: deadline,
        dropoffServiceMinutes: 0,
        priority: priorities[i % priorities.length],
        status: TaskStatus.pending,
        notes: null,
      };
    });
    await prisma.task.createMany({ data: tasks });
  }

  await prisma.geocodeCache.upsert({
    where: { normalizedQuery: 'algiers' },
    update: {
      results: [
        {
          placeId: 'algiers-seed',
          displayName: 'Algiers, Algeria',
          lat: 36.7538,
          lng: 3.0588,
          type: 'city',
          importance: 0.9,
        },
      ],
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    },
    create: {
      normalizedQuery: 'algiers',
      results: [
        {
          placeId: 'algiers-seed',
          displayName: 'Algiers, Algeria',
          lat: 36.7538,
          lng: 3.0588,
          type: 'city',
          importance: 0.9,
        },
      ],
      expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
