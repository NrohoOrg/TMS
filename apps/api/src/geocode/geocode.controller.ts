import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchGeocodeDto } from './dto/search-geocode.dto';
import { GeocodeSearchResult, GeocodeService } from './geocode.service';

@ApiTags('geocode')
@Controller('geocode')
export class GeocodeController {
  constructor(private readonly geocodeService: GeocodeService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search addresses via Nominatim with cache and rate limit' })
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
}
