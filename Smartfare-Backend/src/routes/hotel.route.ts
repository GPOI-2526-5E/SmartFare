import { Router, Request, Response } from "express";
import { HotelSearchParams } from "../models/search-params.model";
import { analyzeHotelOffers } from "../services/AI/analysis/hotel-analysis.service";
import { saveHotelPriceHistory } from "../services/AI/history/hotel-price-history.service";
import { generateHotelRecommendation } from "../services/AI/recommendation/hotel-recommendation.service";
import { searchHotelOffers, searchHotelRooms } from "../services/AI/search/hotel-search.service";

const router = Router();

function parsePagination(source: any) {
    const page = Math.max(1, Number(source.page ?? 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(source.limit ?? 10) || 10));
    return { page, limit };
}

function parseHotelParams(req: Request): HotelSearchParams {
    const source = req.method === "GET" ? req.query : req.body ?? {};

    return {
        destination: typeof source.destination === "string" ? source.destination : undefined,
        checkin: typeof source.checkin === "string" ? source.checkin : undefined,
        checkout: typeof source.checkout === "string" ? source.checkout : undefined,
        guests: Number(source.guests ?? 1) || 1,
        userPreference: typeof source.userPreference === "string" ? source.userPreference : undefined,
    };
}

async function handleHotelSearch(req: Request, res: Response) {
    try {
        const source = req.method === "GET" ? req.query : req.body ?? {};
        const searchParams = parseHotelParams(req);
        const { page, limit } = parsePagination(source);
        console.log("[HOTELS][ROUTE] Payload ricevuto:", {
            destination: searchParams.destination,
            checkin: searchParams.checkin,
            checkout: searchParams.checkout,
            guests: searchParams.guests,
            userPreference: searchParams.userPreference,
            page,
            limit,
        });

        if (!searchParams.destination || !searchParams.checkin || !searchParams.checkout) {
            return res.status(400).json({
                error: "Parametri mancanti",
                required: ["destination", "checkin", "checkout", "guests"],
            });
        }

        const result = await searchHotelOffers(searchParams);
        console.log("[HOTELS][ROUTE] Hotel trovati dal service:", result.total);
        const history = await saveHotelPriceHistory(result.offers);
        console.log("[HOTELS][ROUTE] Righe storico salvate:", history.length);
        const analysis = analyzeHotelOffers(result.offers, history, searchParams.userPreference);
        const recommendation = await generateHotelRecommendation(
            result.offers,
            history,
            analysis,
            searchParams.userPreference
        );
        const total = result.total;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const startIndex = (page - 1) * limit;

        // La UI mostra solo una finestra di risultati per volta,
        // mentre analisi e IA continuano a lavorare sulla lista completa.
        const paginatedOffers = result.offers.slice(startIndex, startIndex + limit);
        const paginatedSearchKeys = new Set(
            paginatedOffers.map((offer) => `${offer.bestRoom.roomId}|${offer.searchKey}`)
        );
        const paginatedHistory = history.filter((item) =>
            paginatedSearchKeys.has(`${item.room_id}|${item.search_key}`)
        );

        return res.status(200).json({
            ...result,
            offers: paginatedOffers,
            history: paginatedHistory,
            analysis,
            recommendation,
            page,
            limit,
            total,
            totalPages,
        });
    } catch (error: any) {
        console.error("Errore ricerca hotel:", error);
        return res.status(500).json({
            error: "Errore durante la ricerca hotel",
            message: error.message,
        });
    }
}

async function handleHotelRooms(req: Request, res: Response) {
    try {
        const hotelId = Number(req.params.hotelId);
        const searchParams = parseHotelParams(req);
        const source = req.method === "GET" ? req.query : req.body ?? {};
        const { page, limit } = parsePagination(source);
        console.log("[HOTELS][ROOMS][ROUTE] Payload ricevuto:", {
            hotelId,
            checkin: searchParams.checkin,
            checkout: searchParams.checkout,
            guests: searchParams.guests,
            page,
            limit,
        });

        if (!hotelId) {
            return res.status(400).json({
                error: "hotelId non valido",
            });
        }

        if (!searchParams.checkin || !searchParams.checkout) {
            return res.status(400).json({
                error: "Parametri mancanti",
                required: ["checkin", "checkout", "guests"],
            });
        }

        const result = await searchHotelRooms(hotelId, searchParams);
        console.log("[HOTELS][ROOMS][ROUTE] Camere trovate dal service:", result.total);
        const total = result.total;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const startIndex = (page - 1) * limit;
        const paginatedOffers = result.offers.slice(startIndex, startIndex + limit);

        return res.status(200).json({
            ...result,
            offers: paginatedOffers,
            page,
            limit,
            total,
            totalPages,
        });
    } catch (error: any) {
        console.error("Errore dettaglio camere hotel:", error);
        return res.status(500).json({
            error: "Errore durante il caricamento delle camere hotel",
            message: error.message,
        });
    }
}

router.get("/search", handleHotelSearch);
router.post("/search", handleHotelSearch);
router.get("/:hotelId/rooms", handleHotelRooms);
router.post("/:hotelId/rooms", handleHotelRooms);

export default router;
