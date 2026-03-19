import { Router, Request, Response } from "express";
import { geminiService } from "../services/ia/gemini.service";
import { getSupabaseClient } from "../config/database";
import {
    escapeRegex,
    extractDateTimeParts,
    formatDuration,
    mapAvailability,
    normalizeDateInput,
} from "../services/ia/searching/search-utils.service";

const router = Router();

function toFilterValue(value: string): string {
    return encodeURIComponent(value.trim());
}

function toPrefixFilterValue(value: string): string {
    return encodeURIComponent(`${value}%`);
}

/**
 * GET /api/health/trains - Health check con test di ricerca treni
 */
router.get("/trains", async (req: Request, res: Response) => {
    try {
        const fromInput = typeof req.query.from === "string" ? req.query.from : "Udine";
        const toInput = typeof req.query.to === "string" ? req.query.to : "Chiavari";
        const dateInput = typeof req.query.date === "string" ? req.query.date : "2026-02-21";

        const { datePrefix } = normalizeDateInput(dateInput);
        if (!datePrefix) {
            return res.status(400).json({
                error: "Data non valida",
                expected: "YYYY-MM-DD oppure DD/MM/YYYY",
            });
        }

        const supabase = getSupabaseClient();
        const departureValue = toFilterValue(fromInput);
        const arrivalValue = toFilterValue(toInput);
        const dateValue = toPrefixFilterValue(datePrefix);

        let query = supabase.from("trains").select("*");

        query = query.or(
            [
                `departure.ilike.${departureValue}`,
                `departure_airport.ilike.${departureValue}`,
                `origin.ilike.${departureValue}`,
            ].join(",")
        );

        query = query.or(
            [
                `arrival.ilike.${arrivalValue}`,
                `arrival_airport.ilike.${arrivalValue}`,
                `destination.ilike.${arrivalValue}`,
            ].join(",")
        );

        query = query.or(
            [
                `departure_time.ilike.${dateValue}`,
                `departure_date.ilike.${dateValue}`,
            ].join(",")
        );

        const { data: trains, error } = await query.limit(200);

        if (error) {
            throw error;
        }

        const dateRegex = new RegExp(`^${escapeRegex(datePrefix)}(?:$|T)`);

        const offers = (trains || [])
            .filter((train: any) => {
                const departureTime = typeof train.departure_time === "string" ? train.departure_time : "";
                const departureDate = typeof train.departure_date === "string" ? train.departure_date : "";
                return dateRegex.test(departureTime) || dateRegex.test(departureDate);
            })
            .map((train: any) => {
                const departureParts = extractDateTimeParts(train.departureTime || train.departure_time || train.departureDate || train.departure_date);
                const arrivalParts = extractDateTimeParts(train.arrivalTime || train.arrival_time || train.arrivalDate || train.arrival_date);

                return {
                    company: train.company || "",
                    departureDate: departureParts.date || datePrefix,
                    departureTime: departureParts.time || "",
                    arrivalTime: arrivalParts.time || "",
                    duration: train.duration || formatDuration(train.durationMin ?? train.duration_min, undefined),
                    price: Number(train.price ?? train.priceEUR ?? train.price_eur ?? 0),
                    trainType: train.trainType || train.train_type || "",
                    changes: Number(train.changes ?? 0),
                    availability: train.availability || mapAvailability(train.seatsAvailable ?? train.seats_available),
                    link: train.link,
                    departure: train.departure || train.departure_airport || train.origin || "",
                    arrival: train.arrival || train.arrival_airport || train.destination || "",
                };
            });

        const recommendation = await geminiService.getRecommendations(offers, {});

        res.json({
            source: "live",
            offers,
            recommendation,
            searchedAt: new Date(),
        });
    } catch (error: any) {
        console.error("Errore ricerca treni:", error);
        res.status(500).json({
            error: "Errore durante la ricerca treni",
            message: error.message,
        });
    }
});

/**
 * GET /api/health/flights - Health check con test di ricerca voli
 */
router.get("/flights", async (req: Request, res: Response) => {
    try {
        const fromInput = typeof req.query.from === "string" ? req.query.from : "Roma Fiumicino";
        const toInput = typeof req.query.to === "string" ? req.query.to : "Trapani Birgi";
        const dateInput = typeof req.query.date === "string" ? req.query.date : "2026-04-04";

        const { datePrefix } = normalizeDateInput(dateInput);
        if (!datePrefix) {
            return res.status(400).json({
                error: "Data non valida",
                expected: "YYYY-MM-DD oppure DD/MM/YYYY",
            });
        }

        const supabase = getSupabaseClient();
        const departureValue = toFilterValue(fromInput);
        const arrivalValue = toFilterValue(toInput);
        const dateValue = toPrefixFilterValue(datePrefix);

        let query = supabase.from("flights").select("*");

        query = query.or(
            [
                `departure_airport.ilike.${departureValue}`,
                `departure.ilike.${departureValue}`,
                `origin.ilike.${departureValue}`,
            ].join(",")
        );

        query = query.or(
            [
                `arrival_airport.ilike.${arrivalValue}`,
                `arrival.ilike.${arrivalValue}`,
                `destination.ilike.${arrivalValue}`,
            ].join(",")
        );

        query = query.or(
            [
                `departure_time.ilike.${dateValue}`,
                `departure_date.ilike.${dateValue}`,
            ].join(",")
        );

        const { data: flights, error } = await query.limit(200);

        if (error) {
            throw error;
        }

        const dateRegex = new RegExp(`^${escapeRegex(datePrefix)}(?:$|T)`);

        const offers = (flights || [])
            .filter((flight: any) => {
                const departureTime = typeof flight.departure_time === "string" ? flight.departure_time : "";
                const departureDate = typeof flight.departure_date === "string" ? flight.departure_date : "";
                return dateRegex.test(departureTime) || dateRegex.test(departureDate);
            })
            .map((flight: any) => {
                const departureParts = extractDateTimeParts(flight.departureTime || flight.departure_time || flight.departureDate || flight.departure_date);
                const arrivalParts = extractDateTimeParts(flight.arrivalTime || flight.arrival_time || flight.arrivalDate || flight.arrival_date);

                return {
                    airline: flight.airline || flight.company || "",
                    flightNumber: flight.flightNumber || "",
                    departureDate: departureParts.date || datePrefix,
                    departureTime: departureParts.time || "",
                    arrivalTime: arrivalParts.time || "",
                    duration: flight.duration || formatDuration(flight.durationMin ?? flight.duration_min, undefined),
                    price: Number(flight.price ?? flight.priceEUR ?? flight.price_eur ?? 0),
                    stops: Number(flight.stops ?? flight.changes ?? 0),
                    cabin: flight.cabin || "",
                    availability: flight.availability || mapAvailability(flight.seatsAvailable ?? flight.seats_available ?? flight.availableSeats ?? flight.available_seats),
                    link: flight.link,
                    departure: flight.departure || flight.departure_airport || flight.origin || "",
                    arrival: flight.arrival || flight.arrival_airport || flight.destination || "",
                };
            });

        const recommendation = await geminiService.getRecommendations(offers, {});

        res.json({
            source: "live",
            offers,
            recommendation,
            searchedAt: new Date(),
        });
    } catch (error: any) {
        console.error("Errore ricerca voli:", error);
        res.status(500).json({
            error: "Errore durante la ricerca voli",
            message: error.message,
        });
    }
});

/**
 * GET /api/health/db-stats - Diagnostica database
 */
router.get("/db-stats", async (_req: Request, res: Response) => {
    try {
        const supabase = getSupabaseClient();

        const { count: totalTrains, error: totalError } = await supabase
            .from("trains")
            .select("id", { count: "exact", head: true });

        if (totalError) {
            throw totalError;
        }

        const { count: cesenaBresciaCount, error: routeError } = await supabase
            .from("trains")
            .select("id", { count: "exact", head: true })
            .ilike("departure", "Cesena")
            .ilike("arrival", "Brescia");

        if (routeError) {
            throw routeError;
        }

        const datePrefix = "2026-03-04";
        const dateValue = toPrefixFilterValue(datePrefix);

        const { data: trainsForDate, error: dateError } = await supabase
            .from("trains")
            .select("departure,arrival,departure_time,company,price,price_eur")
            .or(`departure_time.ilike.${dateValue},departure_date.ilike.${dateValue}`)
            .limit(5000);

        if (dateError) {
            throw dateError;
        }

        const { data: allRoutes, error: allRoutesError } = await supabase
            .from("trains")
            .select("departure,arrival")
            .limit(5000);

        if (allRoutesError) {
            throw allRoutesError;
        }

        const routeCounterForDate = new Map<string, number>();
        for (const row of trainsForDate || []) {
            const key = `${row.departure || ""}::${row.arrival || ""}`;
            routeCounterForDate.set(key, (routeCounterForDate.get(key) || 0) + 1);
        }

        const routeCounter = new Map<string, number>();
        for (const row of allRoutes || []) {
            const key = `${row.departure || ""}::${row.arrival || ""}`;
            routeCounter.set(key, (routeCounter.get(key) || 0) + 1);
        }

        const topRoutesForDate = Array.from(routeCounterForDate.entries())
            .map(([key, count]) => {
                const [from, to] = key.split("::");
                return { from, to, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const topRoutes = Array.from(routeCounter.entries())
            .map(([key, count]) => {
                const [from, to] = key.split("::");
                return { from, to, count };
            })
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const sampleTrains = (trainsForDate || []).slice(0, 5).map((t: any) => ({
            departure: t.departure,
            arrival: t.arrival,
            departureTime: t.departure_time,
            company: t.company,
            price: t.price ?? t.price_eur,
        }));

        res.json({
            database: "supabase",
            table: "trains",
            stats: {
                totalTrains: totalTrains || 0,
                cesenaBresciaCount: cesenaBresciaCount || 0,
                date040326Count: (trainsForDate || []).length,
                topRoutesForDate040326: topRoutesForDate,
                topRoutes,
                sampleTrains,
            },
        });
    } catch (error: any) {
        console.error("Errore stats DB:", error);
        res.status(500).json({
            error: "Errore durante le statistiche",
            message: error.message,
        });
    }
});

/**
 * GET /api/health/trains/list - Get all trains with pagination
 */
router.get("/trains/list", async (req: Request, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string, 10) || 50);
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const supabase = getSupabaseClient();

        const { data: trains, count, error } = await supabase
            .from("trains")
            .select("departure,arrival,departure_time,arrival_time,company,price,train_type,changes,availability", {
                count: "exact",
            })
            .range(from, to);

        if (error) {
            throw error;
        }

        res.json({
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
            trains: (trains || []).map((train: any) => ({
                departure: train.departure,
                arrival: train.arrival,
                departureTime: train.departure_time,
                arrivalTime: train.arrival_time,
                company: train.company,
                price: train.price,
                trainType: train.train_type,
                changes: train.changes,
                availability: train.availability,
            })),
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
