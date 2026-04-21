import { Router, Response, NextFunction } from "express";
import { ItineraryService } from "../services/itinerary/itinerary.service";
import { authenticateJWT, AuthRequest } from "../middleware/auth.middleware";
import { itinerarySchema } from "../schemas/itinerary.schema";
const router = Router();
const itineraryService = new ItineraryService();


// GET /api/itineraries/latest - Get the latest draft for the logged user
router.get("/latest", authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user?.userId);
        if (!userId || Number.isNaN(userId)) return res.status(401).json({ error: "Unauthorized" });

        const draft = await itineraryService.getLatestDraft(userId);
        res.status(200).json(draft);
    } catch (error) {
        next(error);
    }
});

// POST /api/itineraries - Create or update an itinerary
router.post("/", authenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = Number(req.user?.userId);
        if (!userId || Number.isNaN(userId)) return res.status(401).json({ error: "Unauthorized" });

        // Validate request body
        const validatedData = itinerarySchema.parse(req.body);

        const itinerary = await itineraryService.saveItinerary(userId, validatedData);
        res.status(200).json(itinerary);
    } catch (error) {
        next(error);
    }
});

export default router;
