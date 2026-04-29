import { Module } from '@nestjs/common';
import { GeocodeController } from './geocode.controller';
import { GeocodeService } from './geocode.service';
import { GEOCODE_PROVIDER } from './providers/geocode-provider';
import { GoogleMapsProvider } from './providers/google-maps.provider';

@Module({
  controllers: [GeocodeController],
  providers: [
    GeocodeService,
    GoogleMapsProvider,
    { provide: GEOCODE_PROVIDER, useExisting: GoogleMapsProvider },
  ],
  exports: [GeocodeService],
})
export class GeocodeModule {}
