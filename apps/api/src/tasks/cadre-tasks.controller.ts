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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role, Task } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CadreTaskView, TasksService } from './tasks.service';

@ApiTags('cadre/tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CADRE)
@Controller('cadre/tasks')
export class CadreTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('mine')
  @ApiOperation({ summary: 'List tasks created by the current Cadre user' })
  @ApiResponse({ status: 200, description: 'Cadre tasks with derived status' })
  listMine(@CurrentUser() currentUser: AuthenticatedUser): Promise<CadreTaskView[]> {
    return this.tasksService.listMine(currentUser);
  }

  @Post()
  @ApiOperation({ summary: 'Submit a task for dispatcher approval' })
  @ApiResponse({ status: 201, description: 'Task submitted; awaits approval' })
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Task> {
    return this.tasksService.create(dto, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Cadre task (only while not yet approved)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<Task> {
    return this.tasksService.cadreUpdate(id, dto, currentUser);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Cadre task (only while not yet approved)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.tasksService.cadreRemove(id, currentUser);
  }
}
