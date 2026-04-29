import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateStopDto {
  @ApiPropertyOptional({ description: 'Lock the stop so it cannot be moved or re-optimized.' })
  @IsOptional()
  @IsBoolean()
  locked?: boolean;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Manual ETA override in seconds since 00:00 UTC for the plan date.',
    example: 32400,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  etaSecondsOverride?: number;
}
