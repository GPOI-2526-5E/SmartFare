import { Router, Response, NextFunction } from "express";
import { ItineraryService } from "../services/itinerary/itinerary.service";
import { authenticateJWT, AuthRequest } from "../middleware/auth.middleware";
import { itinerarySchema } from "../schemas/itinerary.schema";
import { PrismaClient } from "@prisma/client";
import prisma from "../config/prisma";
const router = Router();


// GET /api/activity/categories
router.get("/categories", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const [categories, hotelCount] = await Promise.all([
            prisma.activityCategory.findMany({
                where: {
                    activities: { some: {} }
                },
                orderBy: { name: "asc" }
            }),
            prisma.accommodation.count()
        ]);

        res.status(200).json({
            categories,
            hasHotels: hotelCount > 0
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/activity/area
// Endpoint ottimizzato per il caricamento Bounding Box sulla mappa Italia
router.get("/area", async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const minLat = parseFloat(req.query.minLat as string);
        const maxLat = parseFloat(req.query.maxLat as string);
        const minLng = parseFloat(req.query.minLng as string);
        const maxLng = parseFloat(req.query.maxLng as string);
        const limit = Math.min(parseInt(req.query.limit as string) || 1000, 5000);
        const categoryIdRaw = req.query.categoryId as string | undefined;
        const categoryId = categoryIdRaw ? parseInt(categoryIdRaw, 10) : undefined;
        const includeHotels = req.query.includeHotels !== 'false';

        if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLng) || isNaN(maxLng)) {
             res.status(400).json({ error: "Invalid bounding box coordinates" });
             return;
        }

        const activityWhere: Record<string, unknown> = {
            latitude: { gte: minLat, lte: maxLat },
            longitude: { gte: minLng, lte: maxLng }
        };
        if (categoryId && !isNaN(categoryId)) {
            activityWhere.categoryId = categoryId;
        }

        const [activities, accommodations] = await Promise.all([
            prisma.activity.findMany({
                where: activityWhere,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    street: true,
                    latitude: true,
                    longitude: true,
                    categoryId: true,
                    imageUrl: true,
                    category: {
                        select: { name: true }
                    }
                }
            }),
            includeHotels
                ? prisma.accommodation.findMany({
                    where: {
                        latitude: { gte: minLat, lte: maxLat },
                        longitude: { gte: minLng, lte: maxLng }
                    },
                    take: limit,
                    select: {
                        id: true,
                        name: true,
                        street: true,
                        latitude: true,
                        longitude: true,
                        imageUrl: true,
                        stars: true
                    }
                })
                : Promise.resolve([])
        ]);

        res.status(200).json({ activities, accommodations });
    } catch (error) {
        next(error);
    }
});

export default router;
