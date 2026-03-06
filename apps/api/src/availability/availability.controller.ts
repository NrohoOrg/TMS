import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Availability, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AvailabilityService, AvailabilityWithSyntheticDefaults } from './availability.service';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@ApiTags('dispatcher/availability')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
@Controller('dispatcher/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  @ApiOperation({ summary: 'Get availability for every active driver on a date' })
  @ApiResponse({ status: 200, description: 'Availability rows' })
  findAll(@Query() query: GetAvailabilityDto): Promise<AvailabilityWithSyntheticDefaults[]> {
    return this.availabilityService.findAll(query.date);
  }

  @Patch(':driverId')
  @ApiOperation({ summary: 'Upsert driver availability for a date' })
  @ApiResponse({ status: 200, description: 'Availability upserted' })
  update(@Param('driverId') driverId: string, @Body() dto: UpdateAvailabilityDto): Promise<Availability> {
    return this.availabilityService.upsert(driverId, dto);
  }
}
