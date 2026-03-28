import { Router, Request, Response } from "express";
import { geminiService } from "../services/ia/gemini.service";
import { FlightSearchParams } from "../models/search-params.model";
import { getSupabaseClient } from "../config/database";
import { Airports } from '../models/database.model';

const router = Router();

router.get('/airports', async (req: Request, res: Response) => {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('airports')
            .select("*")
        if (error) {
            throw error;
        }
        res.json({
            data
        });
    } catch (error: any) {
        console.error("Errore ricerca:", error);
        res.status(500).json({
            error: "Errore durante la ricerca",
            message: error.message
        });
    }
});

router.post("/search", async (req: Request, res: Response) => {
    try {
        const { from, to, date, passengers = 1, userPreference } = req.body;

        if (!from || !to || !date) {
            return res.status(400).json({
                error: "Parametri mancanti",
                required: ["from", "to", "date"]
            });
        }

        const searchParams: FlightSearchParams = {
            from,
            to,
            date,
            passengers: Number(passengers) || 1,
            userPreference
        };

        console.log(`🔍 Ricerca voli nuova: ${from} → ${to} (${date})`);
        const offers = await geminiService.searchFlightOffers(searchParams);
        const recommendation = await geminiService.getRecommendations(offers, userPreference);

        res.json({
            offers,
            recommendation,
            searchedAt: new Date()
        });
    } catch (error: any) {
        console.error("Errore ricerca voli:", error);
        res.status(500).json({
            error: "Errore durante la ricerca",
            message: error.message
        });
    }
});
export default router;