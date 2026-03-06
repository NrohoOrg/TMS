import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user.type';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthService } from './auth.service';

const getAuthRequestIp = (request: Record<string, unknown>): string => {
  const headers = request.headers as Record<string, string | string[] | undefined> | undefined;
  const forwardedFor = headers?.['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.trim() ?? 'unknown';
  }

  return (request as { ip?: string }).ip ?? 'unknown';
};

const BASE_USER_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string', nullable: true },
    email: { type: 'string' },
    role: { type: 'string', enum: Object.values(Role) },
    phone: { type: 'string', nullable: true },
    avatar: { type: 'string', nullable: true },
  },
  required: ['id', 'name', 'email', 'role', 'phone', 'avatar'],
};

const LOGIN_USER_SCHEMA = {
  ...BASE_USER_SCHEMA,
  properties: {
    ...BASE_USER_SCHEMA.properties,
    expiresIn: { type: 'number' },
  },
  required: [...BASE_USER_SCHEMA.required, 'expiresIn'],
};

const ME_SCHEMA = {
  ...BASE_USER_SCHEMA,
  properties: {
    ...BASE_USER_SCHEMA.properties,
    lastLogin: { type: 'string', format: 'date-time', nullable: true },
  },
  required: [...BASE_USER_SCHEMA.required, 'lastLogin'],
};

const PASSWORD_RESET_NOT_IMPLEMENTED_RESPONSE = {
  success: false,
  error: {
    code: 'NOT_IMPLEMENTED',
    message: 'Password reset requires email service configuration. Contact your administrator.',
  },
};

@ApiTags('auth')
@Throttle({
  default: {
    limit: 10,
    ttl: 60_000,
    getTracker: (request) => `ip:${getAuthRequestIp(request)}`,
  },
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Validate credentials and issue JWT tokens' })
  @ApiResponse({
    status: 201,
    description: 'Tokens issued',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        refreshToken: { type: 'string' },
        user: LOGIN_USER_SCHEMA,
      },
      required: ['token', 'refreshToken', 'user'],
    },
  })
  login(@Body() dto: LoginDto): Promise<{
    token: string;
    refreshToken: string;
    user: {
      id: string;
      name: string | null;
      email: string;
      role: Role;
      phone: string | null;
      avatar: string | null;
      expiresIn: number;
    };
  }> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue new pair' })
  @ApiResponse({
    status: 201,
    description: 'Token pair rotated',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        refreshToken: { type: 'string' },
      },
      required: ['token', 'refreshToken'],
    },
  })
  refresh(@Body() dto: RefreshDto): Promise<{ token: string; refreshToken: string }> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all active refresh tokens for current user' })
  @ApiResponse({
    status: 200,
    description: 'User logged out',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
      required: ['message'],
    },
  })
  logout(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    return this.authService.logout(user.id);
  }

  @Post('password-reset')
  @ApiOperation({ summary: 'Request password reset (not implemented)' })
  @ApiResponse({
    status: 501,
    description: 'Not implemented',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', enum: [false] },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['code', 'message'],
        },
      },
      required: ['success', 'error'],
    },
  })
  passwordReset(): never {
    throw new HttpException(PASSWORD_RESET_NOT_IMPLEMENTED_RESPONSE, HttpStatus.NOT_IMPLEMENTED);
  }

  @Post('password-reset/confirm')
  @ApiOperation({ summary: 'Confirm password reset (not implemented)' })
  @ApiResponse({
    status: 501,
    description: 'Not implemented',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', enum: [false] },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
          required: ['code', 'message'],
        },
      },
      required: ['success', 'error'],
    },
  })
  passwordResetConfirm(): never {
    throw new HttpException(PASSWORD_RESET_NOT_IMPLEMENTED_RESPONSE, HttpStatus.NOT_IMPLEMENTED);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user',
    schema: ME_SCHEMA,
  })
  me(@CurrentUser() user: AuthenticatedUser): {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    phone: string | null;
    avatar: string | null;
    lastLogin: Date | null;
  } {
    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email,
      role: user.role,
      phone: user.phone ?? null,
      avatar: user.avatar ?? null,
      lastLogin: user.lastLogin ?? null,
    };
  }
}
