
export enum BookingType {
  FLIGHT = 'FLIGHT',
  TRAIN = 'TRAIN',
  HOTEL = 'HOTEL'
}

export interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  price: number;
  rating: number;
  category: string;
}

export interface SearchParams {
  type: BookingType;
  from: string;
  to: string;
  date: string;
  passengers: number;
}
