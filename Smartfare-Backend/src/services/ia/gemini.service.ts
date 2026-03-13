import { TrainSearchParams, FlightSearchParams } from "../../models/search-params.model";
import { TrainOffer, FlightOffer } from "../../models/database.model";
import { AIRecommendation } from '../../models/api-response.model';
import { searchOffers } from "./searching/offers-search.service";
import { getRecommendations } from "./recommendations.service";

export class GeminiService {

  async searchOffers(params: any, mode: "train" | "flight" = "train"): Promise<any[]> {
    return searchOffers(params, mode);
  }

  async searchTrainOffers(params: TrainSearchParams): Promise<TrainOffer[]> {
    return (await searchOffers(params, "train")) as TrainOffer[];
  }

  async searchFlightOffers(params: FlightSearchParams): Promise<FlightOffer[]> {
    return (await searchOffers(params, "flight")) as FlightOffer[];
  }

  async getRecommendations(offers: any[], userPreferences: any): Promise<AIRecommendation> {
    return getRecommendations(offers, userPreferences);
  }

}

export const geminiService = new GeminiService();