import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Updated planning notes' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
