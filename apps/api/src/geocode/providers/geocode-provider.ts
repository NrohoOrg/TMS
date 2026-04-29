import type { GeocodeSearchResult } from '../geocode.service';

export const GEOCODE_PROVIDER = Symbol('GEOCODE_PROVIDER');

export interface ResolvedCoords {
  lat: number;
  lng: number;
}

export interface GeocodeProvider {
  /**
   * Returns autocomplete suggestions for a query. Some providers (e.g. Google
   * Places Autocomplete) do not include lat/lng in their suggestions; in that
   * case the result's lat/lng will be 0 and the caller is expected to invoke
   * `resolve(placeId)` on selection.
   */
  search(query: string, limit: number): Promise<GeocodeSearchResult[]>;

  /**
   * Returns coordinates for a previously-suggested placeId. Providers whose
   * `search` already includes coordinates (e.g. Nominatim) may return null —
   * the caller should fall back to the lat/lng on the original suggestion.
   */
  resolve(placeId: string): Promise<ResolvedCoords | null>;
}
