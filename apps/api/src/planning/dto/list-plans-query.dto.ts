import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ListPlansQueryDto {
  @ApiPropertyOptional({ example: '2026-04-22', description: 'Filter by plan date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX)
  date?: string;

  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;
}
