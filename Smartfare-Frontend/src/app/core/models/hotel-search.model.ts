export interface HotelSearchCriteria {
  destination: string;
  checkin: string;
  checkout: string;
  guests: number;
  userPreference?: string;
}
