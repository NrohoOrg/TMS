import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DriverUnavailablePreviewQuery } from './dto/driver-unavailable-preview.query';
import { DriverUnavailableDto } from './dto/driver-unavailable.dto';
import { RunMidDayDto } from './dto/run-midday.dto';
import { UrgentInterruptDto } from './dto/urgent-interrupt.dto';
import {
  DriverUnavailablePreviewResponse,
  DriverUnavailableResponse,
  IncidentsService,
  MidDayResponse,
  UrgentInterruptResponse,
} from './incidents.service';

@ApiTags('dispatcher/incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
@Controller('dispatcher/incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get('driver-unavailable/preview')
  @ApiOperation({
    summary: 'Preview tasks that would be released if a driver is marked unavailable',
  })
  @ApiResponse({ status: 200 })
  preview(
    @Query() query: DriverUnavailablePreviewQuery,
  ): Promise<DriverUnavailablePreviewResponse> {
    return this.incidentsService.previewDriverUnavailable(query.driverId, query.date);
  }

  @Post('driver-unavailable')
  @ApiOperation({
    summary: 'Mark a driver unavailable from a chosen time and release pending tasks',
  })
  @ApiResponse({ status: 201 })
  markUnavailable(
    @Body() dto: DriverUnavailableDto,
  ): Promise<DriverUnavailableResponse> {
    return this.incidentsService.markDriverUnavailable(dto);
  }

  @Post('run-midday')
  @ApiOperation({
    summary: 'Run mid-day re-optimization on the published plan (greedy insertion)',
  })
  @ApiResponse({ status: 201 })
  runMidDay(@Body() dto: RunMidDayDto): Promise<MidDayResponse> {
    return this.incidentsService.runMidDayReoptimization(dto.date, dto.dryRun ?? false);
  }

  @Post('urgent-interrupt')
  @ApiOperation({
    summary: 'Divert the closest active driver to handle an urgent task',
  })
  @ApiResponse({ status: 201 })
  urgentInterrupt(
    @Body() dto: UrgentInterruptDto,
  ): Promise<UrgentInterruptResponse> {
    return this.incidentsService.runUrgentInterrupt(dto);
  }
}
