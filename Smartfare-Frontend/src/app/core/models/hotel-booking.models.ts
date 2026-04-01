export interface HotelFeature {
  icon: string;
  label: string;
}

export interface HotelCard {
  hotelId: number;
  name: string;
  area: string;
  country: string;
  stars: number;
  rating: string;
  reviews: string;
  price: string;
  priceValue: number;
  totalPrice: number;
  nights: number;
  accent: string;
  image: string;
  previewImage: string;
  badge: string;
  latitude: number | null;
  longitude: number | null;
  roomType: string;
  roomTypes: string[];
  availableRooms: number;
  services: string[];
  isAiChoice: boolean;
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
  analysis?: HotelSearchAnalysis;
  recommendation?: HotelSearchRecommendation;
}

export interface HotelSearchAnalysisOffer extends HotelSearchApiOffer {
  score?: number;
  previousPrice?: number | null;
  changePercent?: number | null;
  trend?: string;
  comment?: string;
  advice?: 'book_now' | 'wait' | 'stable';
}

export interface HotelSearchAnalysis {
  summary?: string;
  bestOffer?: HotelSearchAnalysisOffer | null;
  cheapestOffer?: HotelSearchAnalysisOffer | null;
  premiumOffer?: HotelSearchAnalysisOffer | null;
  alternatives?: HotelSearchAnalysisOffer[];
  userPreferenceProfile?: {
    rawPreference?: string;
    priorities: string[];
  };
  keyFactors?: string[];
  scenarioComparison?: string[];
}

export interface HotelSearchRecommendation {
  recommendedAction?: 'book_now' | 'wait' | 'monitor';
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
  suggestion?: string;
  bestChoiceSummary?: string;
  alternativesSummary?: string[];
  travelStrategy?: string;
  warning?: string;
}
