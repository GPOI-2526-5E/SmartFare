import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { q } = req.query;
        let where = {};

        if (q && typeof q === 'string' && q.length >= 2) {
            const query = q.toLowerCase();
            const queryDigits = q.replace(/\D/g, '');

            where = {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { province: { contains: query, mode: 'insensitive' } },
                    { cap: queryDigits ? { contains: queryDigits } : undefined }
                ]
            };
        } else if (q) {
             return res.status(200).send([]);
        }

        const locations = await prisma.location.findMany({
            where,
            take: 10
        });

        res.status(200).send(locations);
    } catch (error: any) {
        next(error);
    }
});

export default router;
