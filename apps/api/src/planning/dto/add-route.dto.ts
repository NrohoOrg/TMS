import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class AddRouteDto {
  @ApiProperty({ example: 'driver-uuid' })
  @IsString()
  @IsUUID()
  driverId!: string;
}
