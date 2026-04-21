import { Router, Response } from "express";
import { ItineraryService } from "../services/itinerary/itinerary.service";
import { authenticateJWT, AuthRequest } from "../middleware/auth.middleware";

const router = Router();
const itineraryService = new ItineraryService();

// GET /api/itineraries/latest - Get the latest draft for the logged user
router.get("/latest", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.user?.userId);
        if (!userId || Number.isNaN(userId)) return res.status(401).json({ error: "Unauthorized" });

        const draft = await itineraryService.getLatestDraft(userId);
        res.status(200).json(draft);
    } catch (error) {
        res.status(500).json({ error: "Errore durante il recupero dell'itinerario" });
    }
});

// POST /api/itineraries - Create or update an itinerary
router.post("/", authenticateJWT, async (req: AuthRequest, res: Response) => {
    try {
        const userId = Number(req.user?.userId);
        if (!userId || Number.isNaN(userId)) return res.status(401).json({ error: "Unauthorized" });

        const itinerary = await itineraryService.saveItinerary(userId, req.body);
        res.status(200).json(itinerary);
    } catch (error) {
        res.status(500).json({ error: "Errore durante il salvataggio dell'itinerario" });
    }
});

export default router;
