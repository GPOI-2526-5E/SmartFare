/** Griglia geografica per lazy loading a tile (stile Google Maps). */
export class BboxTileCache {
  private readonly cellSize: number;
  private readonly loaded = new Set<string>();

  constructor(cellSizeDegrees = 0.35) {
    this.cellSize = cellSizeDegrees;
  }

  private cellKey(lat: number, lng: number): string {
    const latCell = Math.floor(lat / this.cellSize);
    const lngCell = Math.floor(lng / this.cellSize);
    return `${latCell}:${lngCell}`;
  }

  private keysForBounds(minLat: number, maxLat: number, minLng: number, maxLng: number): string[] {
    const keys = new Set<string>();
    const latStart = Math.floor(minLat / this.cellSize) * this.cellSize;
    const lngStart = Math.floor(minLng / this.cellSize) * this.cellSize;

    for (let lat = latStart; lat <= maxLat + this.cellSize; lat += this.cellSize) {
      for (let lng = lngStart; lng <= maxLng + this.cellSize; lng += this.cellSize) {
        keys.add(this.cellKey(lat, lng));
      }
    }

    return [...keys];
  }

  getMissingKeys(minLat: number, maxLat: number, minLng: number, maxLng: number): string[] {
    return this.keysForBounds(minLat, maxLat, minLng, maxLng).filter((key) => !this.loaded.has(key));
  }

  markLoaded(minLat: number, maxLat: number, minLng: number, maxLng: number): void {
    for (const key of this.keysForBounds(minLat, maxLat, minLng, maxLng)) {
      this.loaded.add(key);
    }
  }

  clear(): void {
    this.loaded.clear();
  }
}
