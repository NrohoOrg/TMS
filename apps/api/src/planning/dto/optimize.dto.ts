import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class OptimizeDto {
  @ApiProperty({ example: '2026-01-15' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  returnToDepot?: boolean;
}
