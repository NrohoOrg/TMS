import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Driver, Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriversService } from './drivers.service';

@ApiTags('dispatcher/drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER)
@Controller('dispatcher/drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @ApiOperation({ summary: 'List active drivers' })
  @ApiResponse({ status: 200, description: 'Drivers list' })
  findAll(): Promise<Driver[]> {
    return this.driversService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create driver' })
  @ApiResponse({ status: 201, description: 'Driver created' })
  create(@Body() dto: CreateDriverDto): Promise<Driver> {
    return this.driversService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update driver fields' })
  @ApiResponse({ status: 200, description: 'Driver updated' })
  update(@Param('id') id: string, @Body() dto: UpdateDriverDto): Promise<Driver> {
    return this.driversService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a driver' })
  @ApiResponse({ status: 204, description: 'Driver soft deleted' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.driversService.remove(id);
  }
}
