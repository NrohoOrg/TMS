import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SearchGeocodeDto } from './dto/search-geocode.dto';

type NominatimSearchResult = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  importance?: number;
};

export type GeocodeSearchResult = {
  placeId: string;
  displayName: string;
  lat: number;
  lng: number;
  type: string | null;
  importance: number | null;
};

@Injectable()
export class GeocodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async search(dto: SearchGeocodeDto): Promise<GeocodeSearchResult[]> {
    const normalizedQuery = this.normalizeQuery(dto.q);
    if (!normalizedQuery) {
      throw new BadRequestException('q is required');
    }

    const limit = dto.limit ?? 5;
    const now = new Date();
    const cached = await this.prisma.geocodeCache.findUnique({
      where: { normalizedQuery },
    });

    if (cached && cached.expiresAt > now) {
      return this.deserializeCache(cached.results).slice(0, limit);
    }

    await this.acquireRateLimitSlot();
    const results = await this.fetchFromNominatim(normalizedQuery, limit);

    await this.prisma.geocodeCache.upsert({
      where: { normalizedQuery },
      update: {
        results: results as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      create: {
        normalizedQuery,
        results: results as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return results;
  }

  private normalizeQuery(value: string): string {
    return value.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private async acquireRateLimitSlot(): Promise<void> {
    const redis = this.redisService.getClient();
    const rateLimitKey = 'nominatim:rate';
    const acquired = await redis.set(rateLimitKey, '1', 'EX', 1, 'NX');

    if (acquired === 'OK') {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    const retried = await redis.set(rateLimitKey, '1', 'EX', 1, 'NX');
    if (retried !== 'OK') {
      throw new HttpException('Nominatim rate limited', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async fetchFromNominatim(query: string, limit: number): Promise<GeocodeSearchResult[]> {
    const nominatimBaseUrl = (
      this.configService.get<string>('NOMINATIM_URL') ?? 'https://nominatim.openstreetmap.org'
    ).replace(/\/$/, '');

    const response = await axios.get<NominatimSearchResult[]>(`${nominatimBaseUrl}/search`, {
      params: {
        q: query,
        limit,
        format: 'json',
        addressdetails: 0,
      },
      headers: {
        'User-Agent': 'dispatch-planner/1.0',
      },
    });

    return response.data
      .map((result) => this.mapNominatimResult(result))
      .filter((result): result is GeocodeSearchResult => result !== null);
  }

  private mapNominatimResult(result: NominatimSearchResult): GeocodeSearchResult | null {
    const lat = Number(result.lat);
    const lng = Number(result.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    const parsedImportance =
      result.importance === undefined ? null : Number.isFinite(result.importance) ? result.importance : null;

    return {
      placeId: String(result.place_id),
      displayName: result.display_name,
      lat,
      lng,
      type: result.type ?? null,
      importance: parsedImportance,
    };
  }

  private deserializeCache(value: Prisma.JsonValue): GeocodeSearchResult[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }

      const entry = item as Record<string, unknown>;
      const placeId = entry.placeId;
      const displayName = entry.displayName;
      const lat = entry.lat;
      const lng = entry.lng;
      const type = entry.type;
      const importance = entry.importance;

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
