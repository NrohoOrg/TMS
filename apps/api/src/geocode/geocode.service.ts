import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchGeocodeDto } from './dto/search-geocode.dto';
import {
  GEOCODE_PROVIDER,
  type GeocodeProvider,
  type ResolvedCoords,
} from './providers/geocode-provider';

export type GeocodeSearchResult = {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string | null;
  importance: number | null;
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class GeocodeService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GEOCODE_PROVIDER) private readonly provider: GeocodeProvider,
  ) {}

  async search(dto: SearchGeocodeDto): Promise<GeocodeSearchResult[]> {
    const normalizedQuery = this.normalizeQuery(dto.q);
    if (!normalizedQuery) {
      throw new BadRequestException('q is required');
    }

    const limit = dto.limit ?? 5;
    const cached = await this.prisma.geocodeCache.findUnique({
      where: { normalizedQuery },
    });

    if (cached && cached.expiresAt > new Date()) {
      return this.deserializeCache(cached.results).slice(0, limit);
    }

    const results = await this.provider.search(normalizedQuery, limit);

    await this.prisma.geocodeCache.upsert({
      where: { normalizedQuery },
      update: {
        results: results as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
      create: {
        normalizedQuery,
        results: results as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    });

    return results;
  }

  /**
   * Returns coordinates for a placeId returned by `search`. Used when the
   * active provider (e.g. Google Places Autocomplete) does not include
   * lat/lng in its suggestions. Cached against the placeId so repeated
   * selections do not re-hit the provider.
   */
  async resolve(placeId: string): Promise<ResolvedCoords | null> {
    const cacheKey = `placeid:${placeId}`;
    const cached = await this.prisma.geocodeCache.findUnique({
      where: { normalizedQuery: cacheKey },
    });
    if (cached && cached.expiresAt > new Date()) {
      const coords = this.deserializeResolveCache(cached.results);
      if (coords) return coords;
    }

    const resolved = await this.provider.resolve(placeId);
    if (!resolved) return null;

    await this.prisma.geocodeCache.upsert({
      where: { normalizedQuery: cacheKey },
      update: {
        results: resolved as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
      create: {
        normalizedQuery: cacheKey,
        results: resolved as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + CACHE_TTL_MS),
      },
    });

    return resolved;
  }

  private deserializeResolveCache(value: Prisma.JsonValue): ResolvedCoords | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entry = value as Record<string, unknown>;
    const lat = entry.lat;
    const lng = entry.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { lat, lng };
  }

  private normalizeQuery(value: string): string {
    return value.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private deserializeCache(value: Prisma.JsonValue): GeocodeSearchResult[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const entry = item as Record<string, unknown>;
      const { placeId, displayName, lat, lng, type, importance } = entry;

      if (
        typeof placeId !== 'string' ||
        typeof displayName !== 'string' ||
        typeof lat !== 'number' ||
        typeof lng !== 'number'
      ) {
        return [];
      }

      return [
        {
          placeId,
          displayName,
          lat,
          lng,
          type: typeof type === 'string' ? type : null,
          importance: typeof importance === 'number' ? importance : null,
        },
      ];
    });
  }
}
