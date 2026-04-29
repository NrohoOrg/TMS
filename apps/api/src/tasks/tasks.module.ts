import { Module } from '@nestjs/common';
import { PlanningModule } from '../planning/planning.module';
import { CadreTasksController } from './cadre-tasks.controller';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PlanningModule],
  controllers: [TasksController, CadreTasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
