import { Inject, Injectable, OnModuleDestroy, Provider } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RedisService } from '../redis/redis.service';

export type OptimizationQueuePayload = {
  jobId: string;
  date: string;
  returnToDepot: boolean;
};

export const OPTIMIZATION_QUEUE = Symbol('OPTIMIZATION_QUEUE');

export const optimizationQueueProvider: Provider = {
  provide: OPTIMIZATION_QUEUE,
  inject: [RedisService],
  useFactory: (redisService: RedisService) =>
    new Queue<OptimizationQueuePayload>('optimization', {
      connection: redisService.getClient() as any,
    }),
};

@Injectable()
export class OptimizationQueueCleanup implements OnModuleDestroy {
  constructor(
    @Inject(OPTIMIZATION_QUEUE)
    private readonly queue: Queue<OptimizationQueuePayload>,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
