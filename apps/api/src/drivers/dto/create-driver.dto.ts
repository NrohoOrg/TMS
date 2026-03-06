import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min, MinLength } from 'class-validator';

const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateDriverDto {
  @ApiProperty({ example: 'Driver 1' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: '+213555000001' })
  @IsString()
  @MinLength(1)
  phone!: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  @Matches(HH_MM_REGEX, { message: 'shiftStart must match HH:MM' })
  shiftStart!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @Matches(HH_MM_REGEX, { message: 'shiftEnd must match HH:MM' })
  shiftEnd!: string;

  @ApiProperty({ example: 36.7372 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  depotLat!: number;

  @ApiProperty({ example: 3.0865 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  depotLng!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacityUnits?: number;
}
