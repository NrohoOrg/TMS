import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchGeocodeDto {
  @ApiProperty({ example: 'Algiers' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  q!: string;

  @ApiPropertyOptional({ example: 5, default: 5, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit: number = 5;

  @ApiPropertyOptional({ example: '-8.668,36.7,-0.656,18.976', description: 'Viewbox to bias results (left,top,right,bottom)' })
  @IsOptional()
  @IsString()
  viewbox?: string;

  @ApiPropertyOptional({ example: '1', description: 'Strictly limit results to viewbox' })
  @IsOptional()
  @IsString()
  bounded?: string;

  @ApiPropertyOptional({ example: 'dz', description: 'Country code to filter results (e.g., dz for Algeria)' })
  @IsOptional()
  @IsString()
  countrycode?: string;
}
