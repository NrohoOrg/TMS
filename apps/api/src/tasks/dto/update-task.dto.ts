import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';
import { IsEmpty, IsOptional } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({
    enum: TaskStatus,
    description: 'System-managed field that cannot be updated here',
  })
  @IsOptional()
  @IsEmpty({ message: 'status cannot be updated via this endpoint' })
  status?: TaskStatus;
}
