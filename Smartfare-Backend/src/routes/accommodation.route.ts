import { Router, Request, Response, NextFunction } from "express";
import { getHotelsSchema } from "../schemas/accommodation.schema";
import prisma from "../config/prisma";
const router = Router();


// GET /api/accommodation/:id
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { locationId } = getHotelsSchema.parse(req.query);

        const hotels = await prisma.accommodation.findMany({
            where: {
                locationId: locationId
            }
        });

        res.status(200).json(hotels);
    } catch (error) {
        next(error);
    }
});

export default router;
