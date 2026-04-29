import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { MonitorQueryDto } from './dto/monitor-query.dto';
import { ExportReportsQueryDto, ReportsQueryDto } from './dto/reports-query.dto';
import { UpdateStopStatusDto } from './dto/update-stop-status.dto';
import {
  DispatcherImpactResponse,
  DispatcherMonitorResponse,
  DispatcherReportsResponse,
  PlanningService,
  StopStatusUpdateResponse,
} from './planning.service';

const PDF_NOT_IMPLEMENTED_RESPONSE = {
  success: false,
  error: {
    code: 'NOT_IMPLEMENTED',
    message: 'PDF report export is not available in v1. Planned for v2.',
  },
};

type CsvResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    send: (body: string) => void;
  };
};

@ApiTags('dispatcher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
@Controller('dispatcher')
export class DispatcherController {
  constructor(private readonly planningService: PlanningService) {}

  @Patch('stops/:stopId/status')
  @ApiOperation({ summary: 'Update stop status and recalculate downstream ETAs' })
  @ApiResponse({ status: 200, description: 'Stop status updated' })
  @ApiResponse({ status: 409, description: 'Invalid status transition' })
  updateStopStatus(
    @Param('stopId') stopId: string,
    @Body() dto: UpdateStopStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<StopStatusUpdateResponse> {
    return this.planningService.updateStopStatus(stopId, dto, currentUser);
  }

  @Get('monitor')
  @ApiOperation({ summary: 'Get dispatcher monitoring overview' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (defaults to today)' })
  @ApiResponse({ status: 200, description: 'Monitoring overview' })
  monitor(@Query() query: MonitorQueryDto): Promise<DispatcherMonitorResponse> {
    return this.planningService.getMonitor(query.date);
  }

  @Get('impact')
  @ApiOperation({
    summary:
      "Daily impact KPIs (tasks done, km saved vs naive baseline, CO2 / fuel avoided).",
  })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (defaults to today)' })
  @ApiResponse({ status: 200, description: 'Daily impact summary' })
  impact(@Query() query: MonitorQueryDto): Promise<DispatcherImpactResponse> {
    return this.planningService.getImpact(query.date);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get dispatcher reports aggregates' })
  @ApiResponse({ status: 200, description: 'Reports aggregate' })
  reports(@Query() query: ReportsQueryDto): Promise<DispatcherReportsResponse> {
    return this.planningService.getReports(query);
  }

  @Get('reports/export')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export reports summary in CSV or PDF (not implemented)' })
  @ApiResponse({ status: 200, description: 'CSV report exported' })
  @ApiResponse({ status: 501, description: 'PDF export not implemented' })
  async exportReports(
    @Query() query: ExportReportsQueryDto,
    @Res() response: CsvResponse,
  ): Promise<void> {
    if (query.format === 'pdf') {
      throw new HttpException(PDF_NOT_IMPLEMENTED_RESPONSE, HttpStatus.NOT_IMPLEMENTED);
    }

    const reports = await this.planningService.getReports(query);
    const csv = this.planningService.buildDailySummaryCsv(reports.dailySummary);

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${reports.endDate}.csv"`,
    );
    response.status(HttpStatus.OK).send(csv);
  }
}
