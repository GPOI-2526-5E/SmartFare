import { Router, Request, Response } from "express";
import { geminiService } from "../services/ia/gemini.service";
import { TrainSearchParams, FlightSearchParams } from "../models/search-params";

const router = Router();

router.post("/trains", async (req: Request, res: Response) => {
  try {
    const { from, to, date, passengers = 1 } = req.body;

    if (!from || !to || !date) {
      return res.status(400).json({
        error: "Parametri mancanti",
        required: ["from", "to", "date"]
      });
    }

    const searchParams: TrainSearchParams = {
      from,
      to,
      date,
      passengers: Number(passengers) || 1
    };

    console.log(`🔍 Ricerca nuova: ${from} → ${to} (${date})`);
    const offers = await geminiService.searchTrainOffers(searchParams);
    const recommendation = await geminiService.getRecommendations(offers);

    res.json({
      offers,
      recommendation,
      searchedAt: new Date()
    });
  } catch (error: any) {
    console.error("Errore ricerca:", error);
    res.status(500).json({
      error: "Errore durante la ricerca",
      message: error.message
    });
  }
});
router.post("/flights", async (req: Request, res: Response) => {
  try {
    const { from, to, date, passengers = 1 } = req.body;

    if (!from || !to || !date) {
      return res.status(400).json({
        error: "Parametri mancanti",
        required: ["from", "to", "date"]
      });
    }

    const searchParams: FlightSearchParams = {
      from,
      to,
      date,
      passengers: Number(passengers) || 1,
    };

    console.log(`🔍 Ricerca voli nuova: ${from} → ${to} (${date})`);
    const offers = await geminiService.searchFlightOffers(searchParams);
    const recommendation = await geminiService.getRecommendations(offers);

    res.json({
      offers,
      recommendation,
      searchedAt: new Date()
    });
  } catch (error: any) {
    console.error("Errore ricerca voli:", error);
    res.status(500).json({
      error: "Errore durante la ricerca",
      message: error.message
    });
  }
});

export default router;
