import { TrainOfferRecord, FlightOfferRecord } from "./database.model";

export interface AIRecommendation<T = TrainOfferRecord | FlightOfferRecord> {
    bestOffer: T;
    reasoning: string;
    alternatives: T[];
    priceAnalysis: string;
    suggestion: string;
}

export interface TrainRecommendation extends AIRecommendation<TrainOfferRecord> { }

export interface FlightRecommendation extends AIRecommendation<FlightOfferRecord> { }
export interface TrainSearchResponse {
    source: 'live' | 'cached';
    offers: TrainOfferRecord[];
    recommendation?: TrainRecommendation;
    searchedAt: Date;
    totalResults?: number;
}
export interface FlightSearchResponse {
    source: 'live' | 'cached';
    offers: FlightOfferRecord[];
    recommendation?: FlightRecommendation;
    searchedAt: Date;
    totalResults?: number;
}
export interface SearchResponse {
    source: 'live' | 'cached';
    trains?: TrainOfferRecord[];
    flights?: FlightOfferRecord[];
    trainRecommendation?: TrainRecommendation;
    flightRecommendation?: FlightRecommendation;
    searchedAt: Date;
    totalResults?: {
        trains?: number;
        flights?: number;
    };
}
export interface ErrorResponse {
    error: string;
    message: string;
    statusCode?: number;
    timestamp?: Date;
}
export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
    timestamp?: Date;
}
export interface PaginatedResponse<T = any> {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    data: T[];
}
