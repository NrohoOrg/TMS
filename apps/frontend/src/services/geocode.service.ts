import apiClient from "./api-client";
import { API_ENDPOINTS } from "./api-endpoints";

export interface GeocodeResult {
  address: string;
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Search for addresses using the Nominatim geocoding service via backend API
 * Searches are limited to Algeria region
 * @param query - Search query (address, place name, etc.)
 * @returns Array of geocoding results with coordinates filtered to Algeria
 */
export async function geocodeSearch(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await apiClient.get<GeocodeResult[]>(
      API_ENDPOINTS.GEOCODE.SEARCH,
      {
        params: { 
          q: query.trim(),
          // Bias results to Algeria region (approximate bounds)
          // viewbox format: left,top,right,bottom (longitude, latitude)
          viewbox: "-8.668,36.7,-0.656,18.976",
          bounded: "1", // Strictly limit to viewbox
          countrycode: "dz", // Country code for Algeria
        },
      },
    );

    // Response is already unwrapped by interceptor, so response.data contains the array
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error("Geocode search error:", error);
    return [];
  }
}

/**
 * Debounced geocode search for autocomplete
 * @param query - Search query
 * @param delayMs - Debounce delay in milliseconds
 * @returns Promise resolving to geocoding results
 */
export function createDebouncedGeocodeSearch(delayMs = 300) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (query: string): Promise<GeocodeResult[]> => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        const results = await geocodeSearch(query);
        resolve(results);
      }, delayMs);
    });
  };
}
