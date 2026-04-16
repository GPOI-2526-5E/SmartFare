import { Router, Request, Response } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get('/airports', async (req: Request, res: Response) => {
    try {
        const airports = await prisma.airport.findMany();
        res.status(200).send(airports);
    } catch (error: any) {
        console.error("Errore ricerca:", error);
        res.status(500).json({
            error: "Errore durante la ricerca",
            message: error.message
        });
    }
});

export default router;
