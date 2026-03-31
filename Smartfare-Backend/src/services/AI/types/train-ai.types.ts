import { TrainSearchParams } from "../../../models/search-params.model";

export interface TrainSearchOffer {
    trainOfferId: number;
    routeKey: string;
    trainId: number | null;
    company: string;
    trainType: string;
    departure: string;
    arrival: string;
    departureDate: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    changes: number;
    price: number;
    availability: string;
}

export interface TrainSearchResult {
    filters: TrainSearchParams;
    offers: TrainSearchOffer[];
    searchedAt: Date;
    total: number;
}

export interface TrainAnalyzedOffer extends TrainSearchOffer {
    score: number;
    previousPrice: number | null;
    changePercent: number | null;
    trend: string;
    comment: string;
    advice: "book_now" | "wait" | "stable";
}

export interface TrainAnalysisResult {
    bestOffer: TrainAnalyzedOffer | null;
    cheapestOffer: TrainAnalyzedOffer | null;
    fastestOffer: TrainAnalyzedOffer | null;
    alternatives: TrainAnalyzedOffer[];
    summary: string;
    userPreferenceProfile: {
        rawPreference?: string;
        priorities: string[];
    };
    keyFactors: string[];
    scenarioComparison: string[];
}

export interface TrainRecommendationResult {
    recommendedAction: "book_now" | "wait" | "monitor";
    confidence: "high" | "medium" | "low";
    reasoning: string;
    suggestion: string;
    bestChoiceSummary: string;
    alternativesSummary: string[];
    travelStrategy: string;
    warning?: string;
}
