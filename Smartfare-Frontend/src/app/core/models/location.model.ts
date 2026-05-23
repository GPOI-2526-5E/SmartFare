export default interface Location {
  id: number;
  name: string;
  province: string;
  cap: string | number;
  latitude: number;
  longitude: number;
  image?: string | null;
  publicItineraryCount?: number;
}
