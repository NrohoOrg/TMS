import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Pickup shipment A1' })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ example: '10 Rue Didouche Mourad, Alger' })
  @IsString()
  @MinLength(1)
  pickupAddress!: string;

  @ApiProperty({ example: 36.75 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLat!: number;

  @ApiProperty({ example: 3.05 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLng!: number;

  @ApiProperty({ example: '2026-03-04T09:00:00.000Z' })
  @IsDateString()
  pickupWindowStart!: string;

  @ApiProperty({ example: '2026-03-04T10:00:00.000Z' })
  @IsDateString()
  pickupWindowEnd!: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pickupServiceMinutes: number = 0;

  @ApiProperty({ example: 'Rue Hassiba Ben Bouali, Alger' })
  @IsString()
  @MinLength(1)
  dropoffAddress!: string;

  @ApiProperty({ example: 36.8 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropoffLat!: number;

  @ApiProperty({ example: 3.1 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropoffLng!: number;

  @ApiProperty({ example: '2026-03-04T14:00:00.000Z' })
  @IsDateString()
  dropoffDeadline!: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dropoffServiceMinutes: number = 0;

  @ApiPropertyOptional({ enum: Priority, default: Priority.normal })
  @IsOptional()
  @IsEnum(Priority)
  priority: Priority = Priority.normal;

  @ApiPropertyOptional({ example: 'Fragile' })
  @IsOptional()
  @IsString()
  notes?: string;
}
