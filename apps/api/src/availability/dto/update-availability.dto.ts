import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateAvailabilityDto {
  @ApiProperty({ example: '2026-03-04' })
  @Matches(DATE_REGEX, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  available!: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(HH_MM_REGEX, { message: 'shiftStartOverride must match HH:MM' })
  shiftStartOverride?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(HH_MM_REGEX, { message: 'shiftEndOverride must match HH:MM' })
  shiftEndOverride?: string;
}
