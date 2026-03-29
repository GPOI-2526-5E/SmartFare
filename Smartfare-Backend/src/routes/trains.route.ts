import { Router, Request, Response } from "express";
import { geminiService } from "../services/ia/gemini.service";
import { TrainSearchParams } from "../models/search-params.model";

const router = Router();

router.post("/search", async (req: Request, res: Response) => {
    try {
        const { from, to, date, passengers = 1, userPreference } = req.body;

        if (!from || !to || !date) {
            return res.status(400).json({
                error: "Parametri mancanti",
                required: ["from", "to", "date"]
            });
        }

        const searchParams: TrainSearchParams = {
            from,
            to,
            date,
            passengers: Number(passengers) || 1,
            userPreference
        };

        console.log(`🔍 Ricerca nuova: ${from} → ${to} (${date})`);
        const offers = await geminiService.searchTrainOffers(searchParams);
        const recommendation = await geminiService.getRecommendations(offers, userPreference);

        res.json({
            offers,
            recommendation,
            searchedAt: new Date()
        });
    } catch (error: any) {
        console.error("Errore ricerca:", error);
        res.status(500).json({
            error: "Errore durante la ricerca",
            message: error.message
        });
    }
});

export default router;
