import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class RunMidDayDto {
  @ApiPropertyOptional({ description: 'Date YYYY-MM-DD; defaults to today' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @ApiPropertyOptional({
    description:
      'When true, computes assignments and returns them without persisting any changes. Used to preview before committing.',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  dryRun?: boolean;
}
