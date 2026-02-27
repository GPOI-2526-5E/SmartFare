import { Router, Request, Response } from "express";
import { geminiService } from "../services/gemini.services";
import { TrainSearchParams } from "../models/train-search-params";
import { FlightSearchParams } from "../models/flight-search-params";

const router = Router();

/**
 * POST /api/search - Cerca biglietti treno
 * Body: { from, to, date, passengers }
 */
router.post("/trains", async (req: Request, res: Response) => {
  try {
    const { from, to, date, passengers = 1 } = req.body;

    // Validazione
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

    // Cerca con Gemini
    console.log(`🔍 Ricerca nuova: ${from} → ${to} (${date})`);
    const offers = await geminiService.searchTrainOffers(searchParams);

    // Ottieni raccomandazioni
    const recommendation = await geminiService.getRecommendations(offers);

    res.json({
      source: "live",
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


/**
 * POST /api/search/flights - Cerca biglietti aerei
 * Body: { from, to, date, passengers, cabin? }
 */
router.post("/flights", async (req: Request, res: Response) => {
  try {
    const { from, to, date, passengers = 1, cabin } = req.body;

    // Validazione minima
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
      cabin
    };

    console.log(`🔍 Ricerca voli nuova: ${from} → ${to} (${date})`);
    const offers = await geminiService.searchFlightOffers(searchParams);
    const recommendation = await geminiService.getRecommendations(offers);

    res.json({
      source: "live",
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
