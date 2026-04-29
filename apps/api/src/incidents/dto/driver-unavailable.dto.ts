import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class DriverUnavailableDto {
  @ApiProperty({ description: 'Driver UUID' })
  @IsString()
  driverId!: string;

  @ApiProperty({ description: 'Date YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @ApiProperty({ description: 'Driver becomes unavailable starting at this time, HH:MM (24h)' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'fromTime must be HH:MM (24h)',
  })
  fromTime!: string;

  // R5.x easy-path: captured for the dispatcher's record. Today the optimizer
  // treats the driver as off from `fromTime` through end-of-shift regardless;
  // gap availability (re-appearing at toTime) is a future enhancement.
  @ApiPropertyOptional({
    description:
      'Optional return time HH:MM. Currently captured but not enforced — driver stays off for the rest of the day.',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'toTime must be HH:MM (24h)',
  })
  toTime?: string;
}
