import { Module } from '@nestjs/common';
import { DispatcherController } from './dispatcher.controller';
import { PlanningController } from './planning.controller';
import { OptimizationQueueCleanup, optimizationQueueProvider } from './optimization.queue';
import { OptimizationWorker } from './optimization.worker';
import { PlanningService } from './planning.service';

@Module({
  controllers: [PlanningController, DispatcherController],
  providers: [
    PlanningService,
    optimizationQueueProvider,
    OptimizationQueueCleanup,
    OptimizationWorker,
  ],
  exports: [PlanningService],
})
export class PlanningModule {}
