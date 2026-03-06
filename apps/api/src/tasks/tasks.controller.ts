import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role, Task } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { ImportTasksResponseDto } from './dto/import-error.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskImportResult, TaskListResult, TasksService } from './tasks.service';

@ApiTags('dispatcher/tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
@Controller('dispatcher/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated tasks response',
    schema: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
      required: ['items', 'total', 'page', 'limit', 'totalPages'],
    },
  })
  findAll(@Query() query: ListTasksDto): Promise<TaskListResult> {
    return this.tasksService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details by id' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  create(@Body() dto: CreateTaskDto): Promise<Task> {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update a task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto): Promise<Task> {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a task' })
  @ApiResponse({ status: 204, description: 'Task cancelled' })
  @ApiResponse({ status: 409, description: 'Cannot cancel an assigned task' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.tasksService.remove(id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Bulk import tasks from CSV' })
  @ApiResponse({
    status: 201,
    description: 'Import succeeded',
    type: ImportTasksResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Import failed',
    type: ImportTasksResponseDto,
  })
  async importCsv(@UploadedFile() file: Express.Multer.File): Promise<TaskImportResult> {
    const result = await this.tasksService.importFromCsv(file);
    if (result.errors.length > 0) {
      throw new HttpException(result, HttpStatus.BAD_REQUEST);
    }
    return result;
  }
}
