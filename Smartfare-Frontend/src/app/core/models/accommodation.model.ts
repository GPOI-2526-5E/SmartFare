export interface Accommodation {
    id: number;
    name: string;
    street?: string;
    stars: number;
    latitude: number;
    longitude: number;
    imageUrl?: string;
    pricePerNight?: number;
    locationId: number;
}
