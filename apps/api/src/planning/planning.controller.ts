import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { JobStatusDto } from './dto/job-status.dto';
import { OptimizeDto } from './dto/optimize.dto';
import {
  OptimizeJobResponse,
  PlanDetailsResponse,
  PlanListItemResponse,
  PublishPlanResponse,
  PlanningJobStatusResponse,
  PlanningService,
} from './planning.service';

@ApiTags('dispatcher/planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
@Controller('dispatcher/planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Post('optimize')
  @ApiOperation({ summary: 'Queue optimization for a date' })
  @ApiResponse({ status: 201, description: 'Optimization queued' })
  optimize(
    @Body() dto: OptimizeDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<OptimizeJobResponse> {
    return this.planningService.optimize(dto, currentUser);
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get optimization job status' })
  @ApiResponse({ status: 200, type: JobStatusDto })
  status(@Param('jobId') jobId: string): Promise<PlanningJobStatusResponse> {
    return this.planningService.getStatus(jobId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List optimization plans' })
  @ApiResponse({ status: 200, description: 'Plans list' })
  plans(): Promise<PlanListItemResponse[]> {
    return this.planningService.listPlans();
  }

  @Get('plans/:planId')
  @ApiOperation({ summary: 'Get a full plan details with routes and unassigned tasks' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  plan(@Param('planId') planId: string): Promise<PlanDetailsResponse> {
    return this.planningService.getPlan(planId);
  }

  @Post('plans/:planId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a draft plan' })
  @ApiResponse({ status: 200, description: 'Plan published' })
  @ApiResponse({ status: 409, description: 'Only draft plans can be published' })
  publish(@Param('planId') planId: string): Promise<PublishPlanResponse> {
    return this.planningService.publishPlan(planId);
  }
}
