import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePlanDto {
  @ApiProperty({ example: '2026-04-25' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ example: 'Manual plan for Friday' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
