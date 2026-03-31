import { Router, Request, Response } from "express";
import { FlightSearchParams } from "../models/search-params.model";
import { getSupabaseClient } from "../config/database";
import { Airports } from '../models/database.model';

const router = Router();

router.get('/airports', async (req: Request, res: Response) => {
    try {
        const airports: Airports[] = [];
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('airports')
            .select("*")
        if (error) {
            throw error;
        }
        airports.push(...data);
        res.status(200).send(airports);
    } catch (error: any) {
        console.error("Errore ricerca:", error);
        res.status(500).json({
            error: "Errore durante la ricerca",
            message: error.message
        });
    }
});

export default router;
