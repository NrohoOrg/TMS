import { Module } from '@nestjs/common';
import { PlanningModule } from '../planning/planning.module';
import { SmsModule } from '../sms/sms.module';
import { IncidentsController } from './incidents.controller';
import { IncidentsService } from './incidents.service';

@Module({
  imports: [PlanningModule, SmsModule],
  controllers: [IncidentsController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
