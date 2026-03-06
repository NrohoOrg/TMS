import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const REPORT_PERIODS = ['1d', '7d', '30d'] as const;
const REPORT_FORMATS = ['csv', 'pdf'] as const;

export class ReportsQueryDto {
  @ApiPropertyOptional({ enum: REPORT_PERIODS, default: '7d' })
  @IsOptional()
  @IsIn(REPORT_PERIODS)
  period?: (typeof REPORT_PERIODS)[number];

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-07' })
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'endDate must be YYYY-MM-DD' })
  endDate?: string;
}

export class ExportReportsQueryDto extends ReportsQueryDto {
  @ApiPropertyOptional({ enum: REPORT_FORMATS, default: 'csv' })
  @IsOptional()
  @IsIn(REPORT_FORMATS)
  format: (typeof REPORT_FORMATS)[number] = 'csv';
}
