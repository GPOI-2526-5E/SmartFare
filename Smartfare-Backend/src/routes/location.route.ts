import { Router, Request, Response } from "express";
import { geminiService } from "../services/ia/gemini.service";
import { FlightSearchParams } from "../models/search-params.model";
import { getSupabaseClient } from "../config/database";

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('locations')
            .select("*")
        if (error) {
            throw error;
        }
        res.json({
            data
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