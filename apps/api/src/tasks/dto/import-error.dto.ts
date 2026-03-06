import { ApiProperty } from '@nestjs/swagger';

export class ImportErrorDto {
  @ApiProperty({ example: 2 })
  row!: number;

  @ApiProperty({ example: 'pickupLat' })
  field!: string;

  @ApiProperty({ example: 'pickupLat must be between -90 and 90' })
  message!: string;
}

export class ImportTasksResponseDto {
  @ApiProperty({ example: 10 })
  imported!: number;

  @ApiProperty({ type: ImportErrorDto, isArray: true })
  errors!: ImportErrorDto[];
}
