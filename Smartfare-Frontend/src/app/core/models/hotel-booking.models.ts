export interface HotelFeature {
  icon: string;
  label: string;
}

export interface HotelCard {
  name: string;
  area: string;
  country: string;
  rating: string;
  reviews: string;
  price: string;
  accent: string;
  image: string;
  badge: string;
  features: HotelFeature[];
}
