import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StopStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const STOP_STATUS_TRANSITIONS = [StopStatus.arrived, StopStatus.done, StopStatus.skipped] as const;
const HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateStopStatusDto {
  @ApiProperty({ enum: STOP_STATUS_TRANSITIONS })
  @IsIn(STOP_STATUS_TRANSITIONS)
  status!: (typeof STOP_STATUS_TRANSITIONS)[number];

  @ApiPropertyOptional({ example: 'Driver reached gate A.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '09:35', description: 'Actual arrival time in HH:MM format' })
  @IsOptional()
  @IsString()
  @Matches(HHMM_REGEX, { message: 'actualArrivalTime must be HH:MM' })
  actualArrivalTime?: string;
}
