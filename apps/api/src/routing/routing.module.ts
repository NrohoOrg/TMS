import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RoutingMatrixProvider } from '@contracts/index';
import { PrismaModule } from '../prisma/prisma.module';
import { CachedMatrixProvider } from './cached-matrix.provider';
import { GoogleDistanceMatrixProvider } from './google-distance-matrix.provider';
import { HaversineMatrixProvider } from './haversine.provider';
import {
  ROUTING_MATRIX_PROVIDER,
  UPSTREAM_MATRIX_PROVIDER,
} from './routing.constants';

/**
 * Routing wiring:
 *
 *   ROUTING_MATRIX_PROVIDER  →  CachedMatrixProvider
 *                                   wraps
 *   UPSTREAM_MATRIX_PROVIDER →  GoogleDistanceMatrixProvider  (when GOOGLE_MAPS_API_KEY set)
 *                            or HaversineMatrixProvider       (fallback)
 *
 * Consumers depend only on ROUTING_MATRIX_PROVIDER and never see the
 * cache or the upstream choice. The cache layer hits Postgres first and
 * forwards only missing pairs to the upstream provider.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    HaversineMatrixProvider,
    GoogleDistanceMatrixProvider,
    {
      provide: UPSTREAM_MATRIX_PROVIDER,
      inject: [ConfigService, GoogleDistanceMatrixProvider, HaversineMatrixProvider],
      useFactory: (
        config: ConfigService,
        google: GoogleDistanceMatrixProvider,
        haversine: HaversineMatrixProvider,
      ): RoutingMatrixProvider => {
        const apiKey = config.get<string>('GOOGLE_MAPS_API_KEY');
        return apiKey ? google : haversine;
      },
    },
    CachedMatrixProvider,
    {
      provide: ROUTING_MATRIX_PROVIDER,
      useExisting: CachedMatrixProvider,
    },
  ],
  exports: [ROUTING_MATRIX_PROVIDER, HaversineMatrixProvider],
})
export class RoutingModule {}
