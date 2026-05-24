import { Router, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import prisma from '../config/prisma';
import { optionalAuthenticateJWT, AuthRequest } from '../middleware/auth.middleware';
import { aiItineraryChatSchema } from '../schemas/ai.schema';
import { aiItineraryGenerateSchema } from '../schemas/ai-generate.schema';
import { ItineraryService } from '../services/itinerary/itinerary.service';
import { GeminiItineraryChatService } from '../services/ai/gemini.service';
import { AppError } from '../middleware/error.middleware';
import { buildUserPreferencePromptBlock, loadUserPreferenceForAi } from '../utils/user-preference.util';

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
        const userId = req.user?.userId ? Number(req.user.userId) : undefined;
        console.info(`[AI] itinerary chat started locationId=${locationId || 'missing'} userId=${userId || 'guest'}`);

        if (!locationId) {
            throw new AppError('locationId mancante per avviare la chat IA', 400);
        }

        const workspace = await itineraryService.getWorkspaceData(locationId, userId);
        const profile = userId ? await prisma.user.findUnique({
            where: { id: userId },
            select: {
                profile: {
                    select: {
                        name: true,
                        surname: true,
                        bio: true,
                        city: true,
                        birthDate: true
                    }
                },
                preference: {
                    select: {
                        travelCompanion: true,
                        travelStyle: true,
                        pace: true,
                        preferredTransport: true,
                        notes: true
                    }
                }
            }
        }) : null;

        // Persist the user message into an itinerary-bound chat session so it can be retrieved later
        let itineraryChatSessionId: number | null = null;
        if (body.itinerary?.id && userId) {
            const existingItinerary = await prisma.itinerary.findUnique({ where: { id: Number(body.itinerary.id) } });
            if (existingItinerary) {
                if (existingItinerary.chatSessionId) {
                    itineraryChatSessionId = existingItinerary.chatSessionId;
                } else {
                    const created = await prisma.chatSession.create({
                        data: {
                            userId: userId,
                            title: `Itinerary ${existingItinerary.id}`,
                            mode: 'itinerary',
                            locationId: existingItinerary.locationId ?? locationId,
                            lastMessageAt: new Date()
                        }
                    });
                    itineraryChatSessionId = created.id;
                    await prisma.itinerary.update({ where: { id: existingItinerary.id }, data: { chatSessionId: created.id } });
                }

                // Save the user's message in the itinerary chat session
                await prisma.chatMessage.create({ data: { chatId: itineraryChatSessionId, role: 'user', content: body.message } });
            }
        }

        const savedPreferences = userId ? await loadUserPreferenceForAi(userId) : null;
        const userPreferencePrompt = buildUserPreferencePromptBlock(savedPreferences);

        const workspaceContext = {
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
            userPreferencePrompt,
        };

        console.info(
            `[AI] workspace locationId=${locationId} activities=${workspace.activities.length} accommodations=${workspace.accommodations.length} message="${body.message.slice(0, 80)}"`
        );

        const response = await geminiService.generateItineraryEditResponse(body, workspaceContext);

        const userContext = profile ? {
            profile: profile.profile,
            preference: profile.preference
        } : null;

        // Persist assistant reply into itinerary chat session when available
        if (itineraryChatSessionId && response?.reply) {
            await prisma.chatMessage.create({ data: { chatId: itineraryChatSessionId, role: 'assistant', content: response.reply } });
        }

        res.status(200).json({ success: true, ...response, userContext });
        console.info(`[AI] itinerary chat completed locationId=${locationId} userId=${userId || 'guest'}`);
    } catch (error) {
        console.error(`[AI] itinerary chat failed userId=${req.user?.userId || 'guest'}`, error);
        next(error);
    }
});

router.post('/itinerary/generate', aiLimiter, optionalAuthenticateJWT, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { prompt } = aiItineraryGenerateSchema.parse(req.body);
        console.info(`[AI] itinerary generate started userId=${req.user?.userId || 'guest'} promptLength=${prompt.length}`);

        // 1. Fetch all locations to identify the destination
        const locations = await prisma.location.findMany({
            select: { id: true, name: true }
        });

        const locationId = await geminiService.identifyLocation(prompt, locations);

        if (!locationId) {
            throw new AppError(
                'Non riesco a capire la destinazione del viaggio. Indica una città, una regione o un paese più chiaro e riprova.',
                400
            );
        }

        // 2. Fetch workspace data for the identified location
        const workspace = await itineraryService.getWorkspaceData(locationId, req.user?.userId ? Number(req.user.userId) : undefined);

        const userId = req.user?.userId ? Number(req.user.userId) : undefined;
        const savedPreferences = userId ? await loadUserPreferenceForAi(userId) : null;
        const userPreferencePrompt = buildUserPreferencePromptBlock(savedPreferences);

        // 3. Generate the initial itinerary
        const response = await geminiService.generateInitialItinerary(prompt, {
            location: workspace.location
                ? {
                    id: workspace.location.id,
                    name: workspace.location.name,
                    city: workspace.location.name,
                    province: workspace.location.province ?? undefined,
                    country: 'Italia',
                }
                : null,
            itinerary: null,
            accommodations: workspace.accommodations,
            activities: workspace.activities,
            categories: workspace.categories,
            userPreferencePrompt,
        });

        if (!response) {
            throw new AppError('Errore durante la generazione dell\'itinerario. Riprova.', 500);
        }

        res.status(200).json({
            success: true,
            itinerary: {
                ...response,
                locationId,
                location: workspace.location
            }
        });
        console.info(`[AI] itinerary generate completed userId=${req.user?.userId || 'guest'} locationId=${locationId}`);
    } catch (error) {
        console.error(`[AI] itinerary generate failed userId=${req.user?.userId || 'guest'}`, error);
        next(error);
    }
});

export default router;
