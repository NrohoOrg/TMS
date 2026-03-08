import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'node:crypto';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';
import { AvailabilityModule } from './availability/availability.module';
import { AuthModule } from './auth/auth.module';
import { DriverAppModule } from './driver-app/driver-app.module';
import { DriversModule } from './drivers/drivers.module';
import { GeocodeModule } from './geocode/geocode.module';
import { PlanningModule } from './planning/planning.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RoutingModule } from './routing/routing.module';
import { TasksModule } from './tasks/tasks.module';

const getClientIp = (request: Record<string, unknown>): string => {
  const headers = request.headers as Record<string, string | string[] | undefined> | undefined;
  const forwardedFor = headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.trim() ?? 'unknown';
  }
  return (request as { ip?: string }).ip ?? 'unknown';
};

const parseJwtSubject = (token: string): string | null => {
  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const normalized = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    const payload = JSON.parse(Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8')) as {
      sub?: unknown;
    };
    return typeof payload.sub === 'string' && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
};

const rateLimitTracker = (request: Record<string, unknown>): string => {
  const headers = request.headers as Record<string, string | string[] | undefined> | undefined;
  const authorization = headers?.authorization;
  const bearer =
    typeof authorization === 'string'
      ? authorization
      : Array.isArray(authorization)
        ? authorization[0]
        : undefined;

  if (bearer && bearer.startsWith('Bearer ')) {
    const subject = parseJwtSubject(bearer.slice(7).trim());
    if (subject) {
      return `user:${subject}`;
    }
  }

  return `ip:${getClientIp(request)}`;
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 100,
        },
      ],
      getTracker: rateLimitTracker,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
<<<<<<< Updated upstream
=======
        ...(process.env['NODE_ENV'] !== 'production' && {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss',
              ignore: 'pid,hostname',
              singleLine: true,
              messageFormat: '{msg} {req.method} {req.url}',
            },
          },
        }),
>>>>>>> Stashed changes
        genReqId: (req, res) => {
          const requestIdHeader = req.headers['x-request-id'];
          const requestId =
            typeof requestIdHeader === 'string'
              ? requestIdHeader
              : Array.isArray(requestIdHeader)
                ? requestIdHeader[0]
                : randomUUID();

          res.setHeader('x-request-id', requestId);
          return requestId;
        },
        customSuccessObject: (req, res, valueObject) => ({
          ...valueObject,
          requestId: req.id,
          duration:
            (valueObject as { responseTime?: number }).responseTime ??
            (res as { responseTime?: number }).responseTime ??
            0,
        }),
        customErrorObject: (req, res, _error, valueObject) => ({
          ...valueObject,
          requestId: req.id,
          duration:
            (valueObject as { responseTime?: number }).responseTime ??
            (res as { responseTime?: number }).responseTime ??
            0,
        }),
      },
    }),
    AdminModule,
    AuthModule,
    DriversModule,
    DriverAppModule,
    GeocodeModule,
    TasksModule,
    AvailabilityModule,
    PlanningModule,
    PrismaModule,
    RedisModule,
    RoutingModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
