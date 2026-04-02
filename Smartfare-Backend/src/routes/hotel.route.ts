import { Router, Request, Response } from "express";
import { HotelSearchParams } from "../models/search-params.model";
import { analyzeHotelOffers } from "../services/AI/analysis/hotel-analysis.service";
import { saveHotelPriceHistory } from "../services/AI/history/hotel-price-history.service";
import { generateHotelRecommendation } from "../services/AI/recommendation/hotel-recommendation.service";
import { searchHotelOffers, searchHotelRooms } from "../services/AI/search/hotel-search.service";
import { HotelAnalysisResult, HotelRecommendationResult, HotelSearchOffer } from "../services/AI/types/hotel-ai.types";
import { RoomPriceHistoryRecord } from "../models/database.model";

const router = Router();

interface CachedHotelSearchPayload {
    offers: HotelSearchOffer[];
    history: RoomPriceHistoryRecord[];
    analysis: HotelAnalysisResult;
    recommendation: HotelRecommendationResult;
    searchedAt: Date;
    total: number;
}

interface CachedHotelSearchEntry {
    key: string;
    createdAt: number;
    payload: CachedHotelSearchPayload;
}

const HOTEL_SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const HOTEL_SEARCH_CACHE_MAX_ENTRIES = 30;
const hotelSearchCache = new Map<string, CachedHotelSearchEntry>();

function normalizeCacheString(value?: string): string {
    return String(value ?? "").trim().toLowerCase();
}

function buildHotelSearchCacheKey(params: HotelSearchParams): string {
    return [
        normalizeCacheString(params.destination),
        normalizeCacheString(params.checkin),
        normalizeCacheString(params.checkout),
        String(Number(params.guests ?? 1) || 1),
        normalizeCacheString(params.userPreference),
    ].join("|");
}

function readHotelSearchCache(key: string): CachedHotelSearchPayload | null {
    const entry = hotelSearchCache.get(key);
    if (!entry) {
        return null;
    }

    if (Date.now() - entry.createdAt > HOTEL_SEARCH_CACHE_TTL_MS) {
        hotelSearchCache.delete(key);
        return null;
    }

    return entry.payload;
}

function writeHotelSearchCache(key: string, payload: CachedHotelSearchPayload): void {
    hotelSearchCache.set(key, {
        key,
        createdAt: Date.now(),
        payload,
    });

    if (hotelSearchCache.size <= HOTEL_SEARCH_CACHE_MAX_ENTRIES) {
        return;
    }

    const oldestEntry = Array.from(hotelSearchCache.entries()).sort(
        (first, second) => first[1].createdAt - second[1].createdAt
    )[0];

    if (oldestEntry) {
        hotelSearchCache.delete(oldestEntry[0]);
    }
}

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

router.post("/search", async (req: Request, res: Response) => {
    try {
        const source = req.method === "GET" ? req.query : req.body ?? {};
        const searchParams = parseHotelParams(req);
        const { page, limit } = parsePagination(source);
        const cacheKey = buildHotelSearchCacheKey(searchParams);
        console.log("[HOTELS][ROUTE] Payload ricevuto:", {
            destination: searchParams.destination,
            checkin: searchParams.checkin,
            checkout: searchParams.checkout,
            guests: searchParams.guests,
            userPreference: searchParams.userPreference,
            page,
            limit,
            cacheKey,
        });

        if (!searchParams.destination || !searchParams.checkin || !searchParams.checkout) {
            return res.status(400).json({
                error: "Parametri mancanti",
                required: ["destination", "checkin", "checkout", "guests"],
            });
        }

        let cachedPayload = readHotelSearchCache(cacheKey);

        if (!cachedPayload) {
            const result = await searchHotelOffers(searchParams);
            console.log("[HOTELS][ROUTE] Hotel trovati dal service:", result.total);
            const history = await saveHotelPriceHistory(result.offers);
            const skippedHistoryRows = history.filter(
                (item) => item.previous_price !== null && Number(item.previous_price) === Number(item.total_price)
            ).length;
            const insertedHistoryRows = history.length - skippedHistoryRows;
            console.log("[HOTELS][ROUTE] Storico prezzi:", {
                inserted: insertedHistoryRows,
                skippedUnchanged: skippedHistoryRows,
                totalProcessed: history.length,
            });
            const analysis = analyzeHotelOffers(result.offers, history, searchParams.userPreference);
            const recommendation = await generateHotelRecommendation(
                result.offers,
                history,
                analysis,
                searchParams.userPreference
            );

            cachedPayload = {
                offers: result.offers,
                history,
                analysis,
                recommendation,
                searchedAt: result.searchedAt,
                total: result.total,
            };

            writeHotelSearchCache(cacheKey, cachedPayload);
            console.log("[HOTELS][ROUTE] Cache miss: risultato salvato in memoria");
        } else {
            console.log("[HOTELS][ROUTE] Cache hit: paginazione veloce senza ricalcolo IA");
        }

        const total = cachedPayload.total;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const startIndex = (page - 1) * limit;

        const paginatedOffers = cachedPayload.offers.slice(startIndex, startIndex + limit);
        const paginatedSearchKeys = new Set(
            paginatedOffers.map((offer) => `${offer.bestRoom.roomId}|${offer.searchKey}`)
        );
        const paginatedHistory = cachedPayload.history.filter((item) =>
            paginatedSearchKeys.has(`${item.room_id}|${item.search_key}`)
        );

        return res.status(200).json({
            filters: searchParams,
            offers: paginatedOffers,
            history: paginatedHistory,
            analysis: cachedPayload.analysis,
            recommendation: cachedPayload.recommendation,
            searchedAt: cachedPayload.searchedAt,
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
});
router.get("/:hotelId/rooms", async (req: Request, res: Response) => {
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
);

export default router;
