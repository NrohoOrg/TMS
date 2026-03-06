import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

const DRIVER_APP_NOT_IMPLEMENTED = {
  success: false,
  error: {
    code: 'NOT_IMPLEMENTED',
    message: 'Driver app endpoints are not available in v1. Planned for v2.',
  },
};

@ApiTags('driver')
@Controller('driver')
export class DriverAppController {
  @Get('route')
  @ApiOperation({ summary: 'Get driver assigned route (v2 planned)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  route(): never {
    throw new HttpException(DRIVER_APP_NOT_IMPLEMENTED, HttpStatus.NOT_IMPLEMENTED);
  }

  @Patch('stops/:stopNum/status')
  @ApiOperation({ summary: 'Update driver stop status (v2 planned)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  stopStatus(@Param('stopNum') _stopNum: string): never {
    throw new HttpException(DRIVER_APP_NOT_IMPLEMENTED, HttpStatus.NOT_IMPLEMENTED);
  }

  @Post('issues')
  @ApiOperation({ summary: 'Create driver issue report (v2 planned)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  issues(): never {
    throw new HttpException(DRIVER_APP_NOT_IMPLEMENTED, HttpStatus.NOT_IMPLEMENTED);
  }

  @Get('navigation/next')
  @ApiOperation({ summary: 'Get next navigation instruction (v2 planned)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  navigationNext(): never {
    throw new HttpException(DRIVER_APP_NOT_IMPLEMENTED, HttpStatus.NOT_IMPLEMENTED);
  }

  @Post('location')
  @ApiOperation({ summary: 'Update driver location (v2 planned)' })
  @ApiResponse({ status: 501, description: 'Not implemented' })
  location(): never {
    throw new HttpException(DRIVER_APP_NOT_IMPLEMENTED, HttpStatus.NOT_IMPLEMENTED);
  }
}
