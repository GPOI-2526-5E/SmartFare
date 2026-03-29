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
router.get("/api/trains/search", async (req: Request, res: Response) => {
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
router.get("/api/flights/search", async (req: Request, res: Response) => {
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

export default router;
