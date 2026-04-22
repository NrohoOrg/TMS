import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class MoveStopDto {
  @ApiPropertyOptional({
    description:
      'Target route id. Omit to keep the stop in its current route (reorder only).',
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  targetRouteId?: string;

  @ApiProperty({
    example: 4,
    description:
      'New 0-based sequence position within the target route. The other half of the same task will be re-inserted just after.',
  })
  @IsInt()
  @Min(0)
  targetSequence!: number;
}
