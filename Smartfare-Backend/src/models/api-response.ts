import { TrainOffer, FlightOffer } from "./database.model";

export interface AIRecommendation<T = TrainOffer | FlightOffer> {
    bestOffer: T;
    reasoning: string;
    alternatives: T[];
    priceAnalysis: string;
    suggestion: string;
}

export interface TrainRecommendation extends AIRecommendation<TrainOffer> { }

export interface FlightRecommendation extends AIRecommendation<FlightOffer> { }
export interface TrainSearchResponse {
    source: 'live' | 'cached';
    offers: TrainOffer[];
    recommendation?: TrainRecommendation;
    searchedAt: Date;
    totalResults?: number;
}
export interface FlightSearchResponse {
    source: 'live' | 'cached';
    offers: FlightOffer[];
    recommendation?: FlightRecommendation;
    searchedAt: Date;
    totalResults?: number;
}
export interface SearchResponse {
    source: 'live' | 'cached';
    trains?: TrainOffer[];
    flights?: FlightOffer[];
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
