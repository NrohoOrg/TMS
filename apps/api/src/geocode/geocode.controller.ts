import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchGeocodeDto } from './dto/search-geocode.dto';
import { GeocodeSearchResult, GeocodeService } from './geocode.service';
import type { ResolvedCoords } from './providers/geocode-provider';

@ApiTags('geocode')
@Controller('geocode')
export class GeocodeController {
  constructor(private readonly geocodeService: GeocodeService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search addresses with autocomplete suggestions' })
  @ApiResponse({
    status: 200,
    description: 'Mapped geocoding results',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          placeId: { type: 'string' },
          displayName: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          type: { type: 'string', nullable: true },
          importance: { type: 'number', nullable: true },
        },
        required: ['placeId', 'displayName', 'lat', 'lng', 'type', 'importance'],
      },
    },
  })
  search(@Query() query: SearchGeocodeDto): Promise<GeocodeSearchResult[]> {
    return this.geocodeService.search(query);
  }

  @Get('resolve')
  @ApiOperation({
    summary:
      'Resolve a placeId to lat/lng. Required when the active geocoder ' +
      '(e.g. Google Places Autocomplete) does not include coordinates in ' +
      'its suggestions.',
  })
  @ApiQuery({ name: 'placeId', required: true })
  resolve(@Query('placeId') placeId?: string): Promise<ResolvedCoords | null> {
    if (!placeId || !placeId.trim()) {
      throw new BadRequestException('placeId is required');
    }
    return this.geocodeService.resolve(placeId.trim());
  }
}
