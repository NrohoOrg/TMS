import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches } from 'class-validator';

export class DriverUnavailablePreviewQuery {
  @ApiProperty({ description: 'Driver UUID' })
  @IsString()
  driverId!: string;

  @ApiPropertyOptional({ description: 'Date YYYY-MM-DD; defaults to today' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}
