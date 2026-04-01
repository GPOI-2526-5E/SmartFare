export interface HotelFeature {
  icon: string;
  label: string;
}

export interface HotelCard {
  hotelId: number;
  name: string;
  area: string;
  country: string;
  rating: string;
  reviews: string;
  price: string;
  priceValue: number;
  accent: string;
  image: string;
  badge: string;
  latitude: number | null;
  longitude: number | null;
  recommendation?: string;
  roomType: string;
  availableRooms: number;
  services: string[];
  features: HotelFeature[];
}

export interface HotelSearchApiOffer {
  hotelId: number;
  searchKey: string;
  name: string;
  city: string;
  address: string;
  stars: number;
  location: string;
  latitude: number | null;
  longitude: number | null;
  minPricePerNight: number;
  minTotalPrice: number;
  nights: number;
  guests: number;
  availability: string;
  services: string[];
  availableRooms: number;
  roomTypes: string[];
  bestRoom: {
    roomId: number;
    roomType: string;
    roomCapacity: number;
    pricePerNight: number;
    totalPrice: number;
  };
}

export interface HotelSearchApiResponse {
  offers: HotelSearchApiOffer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  analysis?: {
    summary?: string;
    bestOffer?: HotelSearchApiOffer | null;
    cheapestOffer?: HotelSearchApiOffer | null;
  };
  recommendation?: {
    suggestion?: string;
    reasoning?: string;
    bestChoiceSummary?: string;
  };
}
