import { HotelSearchParams } from "../../../models/search-params.model";

export interface HotelRoomOffer {
    hotelId: number;
    roomId: number;
    searchKey: string;
    name: string;
    city: string;
    address: string;
    stars: number;
    location: string;
    latitude: number | null;
    longitude: number | null;
    pricePerNight: number;
    totalPrice: number;
    nights: number;
    guests: number;
    roomType: string;
    roomCapacity: number;
    availability: string;
    services: string[];
}

export interface HotelSearchOffer {
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

export interface HotelSearchResult {
    filters: HotelSearchParams;
    offers: HotelSearchOffer[];
    searchedAt: Date;
    total: number;
}

export interface HotelRoomsResult {
    filters: HotelSearchParams;
    hotelId: number;
    hotelName: string;
    offers: HotelRoomOffer[];
    searchedAt: Date;
    total: number;
}

export interface HotelAnalyzedOffer extends HotelSearchOffer {
    score: number;
    previousPrice: number | null;
    changePercent: number | null;
    trend: string;
    comment: string;
    advice: "book_now" | "wait" | "stable";
}

export interface HotelAnalysisResult {
    bestOffer: HotelAnalyzedOffer | null;
    cheapestOffer: HotelAnalyzedOffer | null;
    premiumOffer: HotelAnalyzedOffer | null;
    alternatives: HotelAnalyzedOffer[];
    summary: string;
    userPreferenceProfile: {
        rawPreference?: string;
        priorities: string[];
    };
    keyFactors: string[];
    scenarioComparison: string[];
}

export interface HotelRecommendationResult {
    recommendedAction: "book_now" | "wait" | "monitor";
    confidence: "high" | "medium" | "low";
    reasoning: string;
    suggestion: string;
    bestChoiceSummary: string;
    alternativesSummary: string[];
    travelStrategy: string;
    warning?: string;
}
