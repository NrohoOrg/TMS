import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsObject, IsOptional, Min } from 'class-validator';

export class UpdateConfigDto {
  @ApiPropertyOptional({ example: 30, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSolveSeconds?: number;

  @ApiPropertyOptional({ example: 40, minimum: 0.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  speedKmh?: number;

  @ApiPropertyOptional({
    example: { urgent: 1000, high: 500, normal: 100, low: 10 },
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  @IsOptional()
  @IsObject()
  objectiveWeights?: Record<string, number>;
}
