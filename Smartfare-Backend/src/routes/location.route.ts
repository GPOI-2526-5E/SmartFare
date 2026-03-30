import { Router, Request, Response } from "express";
import { geminiService } from "../services/ia/gemini.service";
import { FlightSearchParams } from "../models/search-params.model";
import { getSupabaseClient } from "../config/database";

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        const supabase = getSupabaseClient();

        const pageSize = 1000;
        let from = 0;
        let hasMore = true;
        const locations: Location[] = [];

        while (hasMore) {
            const { data, error } = await supabase    
                .from('locations')
                .select('*')
                .range(from, from + pageSize - 1);

            if (error) {
                throw error;
            }

            if (!data || data.length === 0) {
                hasMore = false;
                continue;
            }

            locations.push(...data);

            if (data.length < pageSize) {
                hasMore = false;
                continue;
            }

            from += pageSize;
        }

        res.json({
            data: locations,
            count: locations.length,
        });
    } catch (error: any) {
        console.error("Errore ricerca luoghi:", error);
        res.status(500).json({
            error: "Errore durante la ricerca",
            message: error.message
        });
    }
});

export default router;
