import { Router, Request, Response } from "express";
import { geminiService } from "../services/ia/gemini.service";
import { Train, Flight } from "../models/database.model";

const router = Router();

/**
 * GET /api/health - Health check con test di ricerca
 */
router.get("/trains", async (req: Request, res: Response) => {
  try {
    const fromInput = typeof req.query.from === "string" ? req.query.from : "Udine";
    const toInput = typeof req.query.to === "string" ? req.query.to : "Chiavari";
    const dateInput = typeof req.query.date === "string" ? req.query.date : "2026-02-21";

    const { datePrefix, startDate, endDate } = normalizeDateQuery(dateInput);
    if (!datePrefix || !startDate || !endDate) {
      return res.status(400).json({
        error: "Data non valida",
        expected: "YYYY-MM-DD oppure DD/MM/YYYY",
      });
    }

    console.log(`🔍 Ricerca nuova: ${fromInput} → ${toInput} (${datePrefix}) data: ${new Date().toISOString()}`);

    const departureRegex = new RegExp(`^${escapeRegex(fromInput)}$`, "i");
    const arrivalRegex = new RegExp(`^${escapeRegex(toInput)}$`, "i");

    const dateRegex = new RegExp(`^${escapeRegex(datePrefix)}(?:$|T)`);

    const filter = {
      departure: departureRegex,
      arrival: arrivalRegex,
      $or: [
        { departureTime: { $gte: startDate, $lt: endDate } },
        { departureTime: { $regex: dateRegex } },
        { departureDate: { $regex: dateRegex } },
      ]
    };

    const trains = await Train.find(filter).lean().exec();
    console.log(`✅ Treni trovati per ${datePrefix}: ${trains.length}`);

    // Converti i risultati in TrainOffer
    const offers = trains.map((train: any) => {
      return {
        company: train.company || "",
        departureDate: train.departureDate || "",
        departureTime: train.departureTime || "",
        arrivalTime: train.arrivalTime || "",
        duration: train.duration || formatDuration(train.durationMin, undefined),
        price: Number(train.price ?? train.priceEUR ?? 0),
        trainType: train.trainType || "",
        changes: Number(train.changes ?? 0),
        availability: train.availability || mapAvailability(train.seatsAvailable),
        link: train.link,
        departure: train.departure || "",
        arrival: train.arrival || "",
      };
    });

    // Ottieni raccomandazioni da Gemini
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

// Helper functions
function normalizeDateQuery(dateInput: string): {
  datePrefix?: string;
  startDate?: Date;
  endDate?: Date;
} {
  const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const itaMatch = dateInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  let datePrefix: string | undefined;

  if (isoMatch) {
    datePrefix = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  } else if (itaMatch) {
    datePrefix = `${itaMatch[3]}-${itaMatch[2]}-${itaMatch[1]}`;
  }

  if (!datePrefix || !/^\d{4}-\d{2}-\d{2}$/.test(datePrefix)) {
    return {};
  }

  const startDate = new Date(`${datePrefix}T00:00:00.000Z`);
  const endDate = new Date(`${datePrefix}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);

  return { datePrefix, startDate, endDate };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDateTimeParts(value: unknown): { date?: string; time?: string } {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (match) {
      return { date: match[1], time: match[2] };
    }
    const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})$/);
    if (dateOnly) {
      return { date: dateOnly[1] };
    }
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return {
      date: value.toISOString().slice(0, 10),
      time: value.toISOString().slice(11, 16),
    };
  }
  return {};
}

function formatDuration(durationMin?: number, durationText?: string): string {
  if (typeof durationText === "string" && durationText.trim().length > 0) {
    return durationText;
  }
  if (typeof durationMin === "number" && !isNaN(durationMin)) {
    const hours = Math.floor(durationMin / 60);
    const minutes = durationMin % 60;
    return `${hours}h ${minutes}min`;
  }
  return "";
}

function mapAvailability(seatsAvailable?: number): string {
  if (typeof seatsAvailable !== "number") {
    return "disponibile";
  }
  if (seatsAvailable <= 0) {
    return "esaurito";
  }
  if (seatsAvailable <= 10) {
    return "pochi posti";
  }
  return "disponibile";
}

/**
 * GET /api/health/flights - Health check con test di ricerca voli
 */
router.get("/flights", async (req: Request, res: Response) => {
  try {
    const fromInput = typeof req.query.from === "string" ? req.query.from : "Roma Fiumicino";
    const toInput = typeof req.query.to === "string" ? req.query.to : "Trapani Birgi";
    const dateInput = typeof req.query.date === "string" ? req.query.date : "2026-04-04";

    const { datePrefix, startDate, endDate } = normalizeDateQuery(dateInput);
    if (!datePrefix || !startDate || !endDate) {
      return res.status(400).json({
        error: "Data non valida",
        expected: "YYYY-MM-DD oppure DD/MM/YYYY",
      });
    }

    console.log(`🔍 Ricerca voli nuova: ${fromInput} → ${toInput} (${datePrefix}) data: ${new Date().toISOString()}`);

    const departureRegex = new RegExp(`^${escapeRegex(fromInput)}$`, "i");
    const arrivalRegex = new RegExp(`^${escapeRegex(toInput)}$`, "i");

    const dateRegex = new RegExp(`^${escapeRegex(datePrefix)}(?:$|T)`);

    // Supporta diversi nomi di campi per aeroporti di partenza/arrivo
    const filter = {
      $and: [
        {
          $or: [
            { departureAirport: departureRegex },
            { departure: departureRegex },
            { origin: departureRegex },
            { from: departureRegex }
          ]
        },
        {
          $or: [
            { arrivalAirport: arrivalRegex },
            { arrival: arrivalRegex },
            { destination: arrivalRegex },
            { to: arrivalRegex }
          ]
        },
        {
          $or: [
            { departureTime: { $gte: startDate, $lt: endDate } },
            { departureTime: { $regex: dateRegex } },
            { departureDate: { $regex: dateRegex } },
          ]
        }
      ]
    };

    const flights = await Flight.find(filter).lean().exec();
    console.log(`✅ Voli trovati per ${datePrefix}: ${flights.length}`);

    // Converti i risultati in FlightOffer
    const offers = flights.map((flight: any) => {
      return {
        airline: flight.airline || flight.company || "",
        flightNumber: flight.flightNumber || "",
        departureDate: flight.departureDate || "",
        departureTime: flight.departureTime || "",
        arrivalTime: flight.arrivalTime || "",
        duration: flight.duration || formatDuration(flight.durationMin, undefined),
        price: Number(flight.price ?? flight.priceEUR ?? 0),
        stops: Number(flight.stops ?? flight.changes ?? 0),
        cabin: flight.cabin || "",
        availability: flight.availability || mapAvailability(flight.seatsAvailable ?? flight.availableSeats),
        link: flight.link,
        departure: flight.departure || flight.departureAirport || flight.origin || flight.from || "",
        arrival: flight.arrival || flight.arrivalAirport || flight.destination || flight.to || "",
      };
    });

    // Ottieni raccomandazioni da Gemini
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
      error: "Errore durante la ricerca voli",
      message: error.message
    });
  }
});

/**
 * GET /api/health/db-stats - Diagnostica database
 */
router.get("/db-stats", async (req: Request, res: Response) => {
  try {
    const totalTrains = await Train.estimatedDocumentCount();

    // Conta treni per Cesena-Brescia
    const cesenaBresciaCount = await Train.countDocuments({
      departure: /^Cesena$/i,
      arrival: /^Brescia$/i
    });

    // Conta treni per il 04/03/2026
    const date040326Count = await Train.countDocuments({
      departureTime: { $regex: "2026-03-04" }
    });

    // Trova le tratte più comuni per il 04/03/2026
    const topRoutesForDate = await Train.aggregate([
      { $match: { departureTime: { $regex: "2026-03-04" } } },
      { $group: { _id: { departure: "$departure", arrival: "$arrival" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).exec();

    // Campioni per il 04/03/2026
    const sampleTrains = await Train
      .find({ departureTime: { $regex: "2026-03-04" } })
      .limit(5)
      .lean()
      .exec();

    // Trova le tratte più comuni (tutte le date)
    const topRoutes = await Train.aggregate([
      { $group: { _id: { departure: "$departure", arrival: "$arrival" }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).exec();

    res.json({
      database: "Smartfare",
      collection: "Trains",
      stats: {
        totalTrains,
        cesenaBresciaCount,
        date040326Count,
        topRoutesForDate040326: topRoutesForDate.map((r: any) => ({
          from: r._id.departure,
          to: r._id.arrival,
          count: r.count
        })),
        topRoutes: topRoutes.map((r: any) => ({
          from: r._id.departure,
          to: r._id.arrival,
          count: r.count
        })),
        sampleTrains: sampleTrains.map((t: any) => ({
          departure: t.departure,
          arrival: t.arrival,
          departureTime: t.departureTime,
          company: t.company,
          price: t.price ?? t.priceEUR
        }))
      }
    });
  } catch (error: any) {
    console.error("Errore stats DB:", error);
    res.status(500).json({
      error: "Errore durante le statistiche",
      message: error.message
    });
  }
});

/**
 * GET /api/health/trains - Get all trains with pagination
 */
router.get("/trains", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const skip = (page - 1) * limit;

    const total = await Train.countDocuments();
    const trains = await Train
      .find({})
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const formattedTrains = trains.map((t: any) => ({
      departure: t.departure,
      arrival: t.arrival,
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime,
      company: t.company,
      price: t.price,
      trainType: t.trainType,
      changes: t.changes,
      availability: t.availability,
    }));

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      trains: formattedTrains,
    });
  } catch (error: any) {
    console.error("Errore recupero treni:", error);
    res.status(500).json({
      error: "Errore durante il recupero dei treni",
      message: error.message,
    });
  }
});

export default router;
