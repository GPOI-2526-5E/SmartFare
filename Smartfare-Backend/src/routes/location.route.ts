import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        // With Prisma, we can fetch all locations simply. 
        // If the table grows very large, we can reconsider pagination.
        const locations = await prisma.location.findMany();

        res.status(200).send(locations);
    } catch (error: any) {
        console.error("Errore ricerca luoghi:", error);
        res.status(500).json({
            error: "Errore durante la ricerca",
            message: error.message
        });
    }
});

export default router;
