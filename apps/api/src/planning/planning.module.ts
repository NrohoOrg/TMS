import { Module } from '@nestjs/common';
import { DispatcherController } from './dispatcher.controller';
import { ManualPlanningController } from './manual-planning.controller';
import { ManualPlanningService } from './manual-planning.service';
import { PlanningController } from './planning.controller';
import { OptimizationQueueCleanup, optimizationQueueProvider } from './optimization.queue';
import { OptimizationWorker } from './optimization.worker';
import { PlanningService } from './planning.service';
import { RoutingModule } from '../routing/routing.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [SmsModule, RoutingModule],
  controllers: [PlanningController, ManualPlanningController, DispatcherController],
  providers: [
    PlanningService,
    ManualPlanningService,
    optimizationQueueProvider,
    OptimizationQueueCleanup,
    OptimizationWorker,
  ],
  exports: [PlanningService, ManualPlanningService],
})
export class PlanningModule {}
