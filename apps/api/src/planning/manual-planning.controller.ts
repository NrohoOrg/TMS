import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AddRouteDto } from './dto/add-route.dto';
import { AddTaskToRouteDto } from './dto/add-task-to-route.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';
import { MoveStopDto } from './dto/move-stop.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
import { ManualPlanningService } from './manual-planning.service';

@ApiTags('dispatcher/planning/manual')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
@Controller('dispatcher/planning')
export class ManualPlanningController {
  constructor(private readonly service: ManualPlanningService) {}

  /* ─────────── plans ─────────── */

  @Get('plans-extended')
  @ApiOperation({ summary: 'List plans with optional date and status filters' })
  list(@Query() query: ListPlansQueryDto) {
    return this.service.listPlans(query);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create an empty draft plan for a date' })
  @ApiResponse({ status: 201 })
  createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.createPlan(dto, currentUser);
  }

  @Patch('plans/:planId/meta')
  @ApiOperation({ summary: 'Edit draft plan metadata (notes)' })
  updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.updatePlan(planId, dto, currentUser);
  }

  @Delete('plans/:planId')
  @ApiOperation({ summary: 'Discard a draft plan and free its tasks' })
  @HttpCode(HttpStatus.OK)
  deletePlan(@Param('planId') planId: string) {
    return this.service.deletePlan(planId);
  }

  @Post('plans/:planId/recalculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recompute ETAs and totals for a draft plan' })
  recalculate(
    @Param('planId') planId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.recalculatePlan(planId, currentUser);
  }

  @Get('plans/:planId/unassigned')
  @ApiOperation({
    summary: 'Get pending tasks within the plan date that are not yet assigned in any plan',
  })
  unassignedForPlanDate(@Param('planId') planId: string, @Query('date') date: string) {
    // Date is required in query; controller does not need plan lookup beyond auth
    return this.service.getUnassignedTasksForDate(date);
  }

  /* ─────────── routes ─────────── */

  @Post('plans/:planId/routes')
  @ApiOperation({ summary: 'Add a route (driver) to a draft plan' })
  addRoute(
    @Param('planId') planId: string,
    @Body() dto: AddRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.addRoute(planId, dto, currentUser);
  }

  @Delete('routes/:routeId')
  @ApiOperation({ summary: 'Remove a route from a draft plan and free its tasks' })
  @HttpCode(HttpStatus.OK)
  removeRoute(
    @Param('routeId') routeId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.deleteRoute(routeId, currentUser);
  }

  /* ─────────── stops ─────────── */

  @Post('routes/:routeId/stops')
  @ApiOperation({ summary: 'Append a task (pickup + dropoff) to a draft route' })
  addTaskToRoute(
    @Param('routeId') routeId: string,
    @Body() dto: AddTaskToRouteDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.addTaskToRoute(routeId, dto, currentUser);
  }

  @Patch('stops/:stopId/move')
  @ApiOperation({ summary: 'Move a stop to a new route or sequence position' })
  moveStop(
    @Param('stopId') stopId: string,
    @Body() dto: MoveStopDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.moveStop(stopId, dto, currentUser);
  }

  @Patch('stops/:stopId/meta')
  @ApiOperation({ summary: 'Set stop locked/notes/eta override' })
  updateStop(
    @Param('stopId') stopId: string,
    @Body() dto: UpdateStopDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.updateStop(stopId, dto, currentUser);
  }

  @Delete('stops/:stopId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a stop (and its sibling) from the route, freeing the task' })
  deleteStop(
    @Param('stopId') stopId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.service.removeStop(stopId, currentUser);
  }
}
