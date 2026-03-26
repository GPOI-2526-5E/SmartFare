import { Router, Request, Response } from 'express';
import { getSupabaseClient } from "../config/database";

const router = Router();

router.get('/airports', async (req: Request, res: Response) => {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('Airports')
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
})

export default router;