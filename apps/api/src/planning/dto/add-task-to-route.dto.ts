import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddTaskToRouteDto {
  @ApiProperty({ example: 'task-uuid' })
  @IsString()
  @IsUUID()
  taskId!: string;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Insertion index for the pickup stop in the route (0-based). Dropoff is inserted right after. Defaults to end.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  insertAtSequence?: number;
}
