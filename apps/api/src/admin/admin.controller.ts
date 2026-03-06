import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Config as PlannerConfig, Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { AdminHealthResponse, AdminService, AdminUserResponse } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateConfigDto } from './dto/update-config.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  @ApiOperation({ summary: 'Run health checks for db, redis, and optimizer' })
  @ApiResponse({
    status: 200,
    description: 'Always returns 200 with overall and per-service status',
  })
  health(): Promise<AdminHealthResponse> {
    return this.adminService.health();
  }

  @Get('config')
  @ApiOperation({ summary: 'Get dispatch configuration (id=1)' })
  @ApiResponse({
    status: 200,
    description: 'Current config row',
  })
  config(): Promise<PlannerConfig> {
    return this.adminService.getConfig();
  }

  @Patch('config')
  @ApiOperation({ summary: 'Partially update dispatch configuration (id=1)' })
  @ApiResponse({
    status: 200,
    description: 'Updated config row',
  })
  updateConfig(@Body() dto: UpdateConfigDto): Promise<PlannerConfig> {
    return this.adminService.updateConfig(dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List admin-managed users' })
  @ApiResponse({ status: 200, description: 'Users list' })
  async users(): Promise<
    Array<{
      id: string;
      name: string | null;
      email: string;
      role: Role;
      lastLogin: Date | null;
      createdAt: Date;
    }>
  > {
    const users = await this.adminService.listUsers();
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    }));
  }

  @Post('users')
  @ApiOperation({ summary: 'Create user account' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  createUser(@Body() dto: CreateUserDto): Promise<AdminUserResponse> {
    return this.adminService.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user fields (name/email/role/phone)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<AdminUserResponse> {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete current user' })
  @ApiResponse({ status: 409, description: 'User has optimization jobs' })
  async deleteUser(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.adminService.deleteUser(id, user.id);
  }
}
