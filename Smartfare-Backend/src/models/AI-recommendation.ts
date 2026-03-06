import { TrainOffer } from "./database.model";

export interface AIRecommendation {
    bestOffer: TrainOffer;
    reasoning: string;
    alternatives: TrainOffer[];
    priceAnalysis: string;
    suggestion: string;
}