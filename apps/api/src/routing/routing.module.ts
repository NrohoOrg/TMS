import { Module } from '@nestjs/common';
import { HaversineMatrixProvider } from './haversine.provider';
import { ROUTING_MATRIX_PROVIDER } from './routing.constants';

@Module({
  providers: [
    HaversineMatrixProvider,
    {
      provide: ROUTING_MATRIX_PROVIDER,
      useExisting: HaversineMatrixProvider,
    },
  ],
  exports: [ROUTING_MATRIX_PROVIDER, HaversineMatrixProvider],
})
export class RoutingModule {}
