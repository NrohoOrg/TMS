export const ROUTING_MATRIX_PROVIDER = Symbol('ROUTING_MATRIX_PROVIDER');

/** Internal token: the upstream provider that the cache layer wraps.
 *  Bound to GoogleDistanceMatrixProvider when GOOGLE_MAPS_API_KEY is set,
 *  otherwise to HaversineMatrixProvider as a graceful fallback. */
export const UPSTREAM_MATRIX_PROVIDER = Symbol('UPSTREAM_MATRIX_PROVIDER');
