import { Router, Request, Response } from "express";
import { TrainSearchParams } from "../models/search-params.model";
import { searchTrainOffers } from "../services/AI/search/train-search.service";
import { saveTrainPriceHistory } from "../services/AI/history/train-price-history.service";
import { analyzeTrainOffers } from "../services/AI/analysis/train-analysis.service";
import { generateTrainRecommendation } from "../services/AI/recommendation/train-recommendation.service";

const router = Router();

router.post("/search", async (req: Request, res: Response) => {
    try {
        const { originStationId, destinationStationId, date, passengers = 1, userPreference } = req.body;
        console.log("[TRAINS][ROUTE] Payload ricevuto:", {
            originStationId,
            destinationStationId,
            date,
            passengers,
            userPreference,
        });

        if (!originStationId || !destinationStationId || !date) {
            return res.status(400).json({
                error: "Parametri mancanti",
                required: ["originStationId", "destinationStationId", "date"],
            });
        }

        const searchParams: TrainSearchParams = {
            originStationId,
            destinationStationId,
            date,
            passengers: Number(passengers) || 1,
            userPreference,
        };

        const result = await searchTrainOffers(searchParams);
        console.log("[TRAINS][ROUTE] Offerte restituite dal service:", result.total);
        const history = await saveTrainPriceHistory(result.offers);
        const skippedHistoryRows = history.filter(
            (item) => item.previous_price !== null && Number(item.previous_price) === Number(item.total_price)
        ).length;
        const insertedHistoryRows = history.length - skippedHistoryRows;
        console.log("[TRAINS][ROUTE] Storico prezzi:", {
            inserted: insertedHistoryRows,
            skippedUnchanged: skippedHistoryRows,
            totalProcessed: history.length,
        });
        const analysis = analyzeTrainOffers(result.offers, history, userPreference);
        const recommendation = await generateTrainRecommendation(
            result.offers,
            history,
            analysis,
            userPreference
        );

        return res.status(200).json({
            ...result,
            history,
            analysis,
            recommendation,
        });
    } catch (error: any) {
        console.error("Errore ricerca treni:", error);
        return res.status(500).json({
            error: "Errore durante la ricerca treni",
            message: error.message,
        });
    }
});


export default router;
