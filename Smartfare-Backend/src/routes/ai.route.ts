import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuthenticateJWT, AuthRequest } from '../middleware/auth.middleware';
import { aiItineraryChatSchema } from '../schemas/ai.schema';
import { ItineraryService } from '../services/itinerary/itinerary.service';
import { GeminiItineraryChatService } from '../services/ai/gemini.service';
import { AppError } from '../middleware/error.middleware';

const router = Router();
const itineraryService = new ItineraryService();
const geminiService = new GeminiItineraryChatService();

const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Troppi messaggi AI. Riprova tra 1 minuto.'
    }
});

router.post('/itinerary/chat', aiLimiter, optionalAuthenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const body = aiItineraryChatSchema.parse(req.body);
        const locationId = body.locationId || body.itinerary?.locationId;

        if (!locationId) {
            throw new AppError('locationId mancante per avviare la chat IA', 400);
        }

        const workspace = await itineraryService.getWorkspaceData(locationId, req.user?.userId ? Number(req.user.userId) : undefined);

        const response = await geminiService.generateChatResponse(body, {
            location: workspace.location
                ? {
                    id: workspace.location.id,
                    name: workspace.location.name,
                    city: workspace.location.name,
                    province: workspace.location.province ?? undefined,
                    country: 'Italia',
                }
                : null,
            itinerary: body.itinerary || workspace.draft,
            accommodations: workspace.accommodations,
            activities: workspace.activities,
            categories: workspace.categories,
        });

        res.status(200).json({
            success: true,
            ...response,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
