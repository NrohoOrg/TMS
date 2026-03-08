export interface RoutingMatrixProvider {
    getMatrix(points: LatLng[]): Promise<RoutingMatrix>;
}
export interface LatLng {
    lat: number;
    lng: number;
}
export interface RoutingMatrix {
    durations: number[][];
    distances: number[][];
}
