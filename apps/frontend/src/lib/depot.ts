// Single source of truth for the fleet's home depot. Every driver starts and
// ends each day here — the "Ministère délégué chargé de l'Économie de la
// Connaissance, des Start-up et des Micro-entreprises" in Algiers.
//
// The admin "add driver" form does not ask for these coords; it submits them
// silently. If the Ministère ever moves, change it once here.
export const MINISTRY_DEPOT = {
  lat: 36.7538,
  lng: 3.0588,
  name: "Ministère des Startups",
} as const;
