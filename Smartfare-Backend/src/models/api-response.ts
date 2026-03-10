import { TrainOffer, FlightOffer } from "./database.model";

/**
 * Raccomandazione AI generica
 */
export interface AIRecommendation<T = TrainOffer | FlightOffer> {
    bestOffer: T;
    reasoning: string;
    alternatives: T[];
    priceAnalysis: string;
    suggestion: string;
}

/**
 * Raccomandazione AI per treni
 */
export interface TrainRecommendation extends AIRecommendation<TrainOffer> { }

/**
 * Raccomandazione AI per voli
 */
export interface FlightRecommendation extends AIRecommendation<FlightOffer> { }

/**
 * Risposta API per ricerca treni
 */
export interface TrainSearchResponse {
    source: 'live' | 'cached';
    offers: TrainOffer[];
    recommendation?: TrainRecommendation;
    searchedAt: Date;
    totalResults?: number;
}

/**
 * Risposta API per ricerca voli
 */
export interface FlightSearchResponse {
    source: 'live' | 'cached';
    offers: FlightOffer[];
    recommendation?: FlightRecommendation;
    searchedAt: Date;
    totalResults?: number;
}

/**
 * Risposta API unificata (per ricerche combinate)
 */
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

/**
 * Risposta generica API con errore
 */
export interface ErrorResponse {
    error: string;
    message: string;
    statusCode?: number;
    timestamp?: Date;
}

/**
 * Risposta API generica di successo
 */
export interface SuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
    timestamp?: Date;
}

/**
 * Risposta paginata
 */
export interface PaginatedResponse<T = any> {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    data: T[];
}
