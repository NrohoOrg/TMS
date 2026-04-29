import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { GeocodeSearchResult } from '../geocode.service';
import type { GeocodeProvider, ResolvedCoords } from './geocode-provider';

type AutocompletePrediction = {
  place_id: string;
  description: string;
  types?: string[];
};

type AutocompleteResponse = {
  status: string;
  predictions?: AutocompletePrediction[];
  error_message?: string;
};

type DetailsResponse = {
  status: string;
  result?: {
    geometry?: {
      location?: { lat?: number; lng?: number };
    };
  };
  error_message?: string;
};

const DEFAULT_AUTOCOMPLETE_URL =
  'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const DEFAULT_DETAILS_URL =
  'https://maps.googleapis.com/maps/api/place/details/json';

@Injectable()
export class GoogleMapsProvider implements GeocodeProvider {
  private readonly logger = new Logger(GoogleMapsProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async search(query: string, limit: number): Promise<GeocodeSearchResult[]> {
    const apiKey = this.requireKey();
    const url = this.configService.get<string>(
      'GOOGLE_MAPS_AUTOCOMPLETE_BASE_URL',
    ) ?? DEFAULT_AUTOCOMPLETE_URL;

    const response = await axios.get<AutocompleteResponse>(url, {
      params: {
        input: query,
        key: apiKey,
        // Hard-restrict suggestions to Algerian addresses; results returned
        // in French since the dispatcher operates in Algeria.
        components: 'country:dz',
        language: 'fr',
      },
    });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      this.logger.warn(
        `Places Autocomplete returned ${response.data.status}: ${response.data.error_message ?? '(no message)'}`,
      );
      return [];
    }

    const predictions = (response.data.predictions ?? []).slice(0, limit);
    return predictions.map((p) => ({
      placeId: p.place_id,
      displayName: p.description,
      // Google Places Autocomplete does not return coordinates; the caller
      // must invoke /geocode/resolve on selection.
      lat: 0,
      lng: 0,
      type: p.types?.[0] ?? null,
      importance: null,
    }));
  }

  async resolve(placeId: string): Promise<ResolvedCoords | null> {
    const apiKey = this.requireKey();
    const url = this.configService.get<string>(
      'GOOGLE_MAPS_DETAILS_BASE_URL',
    ) ?? DEFAULT_DETAILS_URL;

    const response = await axios.get<DetailsResponse>(url, {
      params: {
        place_id: placeId,
        key: apiKey,
        fields: 'geometry',
      },
    });

    if (response.data.status !== 'OK') {
      this.logger.warn(
        `Places Details returned ${response.data.status}: ${response.data.error_message ?? '(no message)'}`,
      );
      return null;
    }

    const loc = response.data.result?.geometry?.location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      return null;
    }
    return { lat: loc.lat, lng: loc.lng };
  }

  private requireKey(): string {
    const key = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!key) {
      throw new InternalServerErrorException(
        'GOOGLE_MAPS_API_KEY is not configured',
      );
    }
    return key;
  }
}
