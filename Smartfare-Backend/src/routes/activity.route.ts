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
        const categories = await prisma.activityCategory.findMany({});
        res.status(200).json(categories);
    } catch (error) {
        next(error);
    }
});

export default router;
