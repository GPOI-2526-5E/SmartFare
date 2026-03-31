import { RoomPriceHistoryRecord } from "../../../models/database.model";
import { HotelAnalysisResult, HotelAnalyzedOffer, HotelSearchOffer } from "../types/hotel-ai.types";

function normalizePreference(preference?: string): string {
    return String(preference ?? "").trim().toLocaleLowerCase("it-IT");
}

function inferPriorities(userPreference?: string): string[] {
    const normalized = normalizePreference(userPreference);
    const priorities: string[] = [];

    if (normalized.includes("econom") || normalized.includes("prezzo") || normalized.includes("budget")) {
        priorities.push("price");
    }

    if (normalized.includes("lusso") || normalized.includes("stelle") || normalized.includes("comfort")) {
        priorities.push("quality");
    }

    if (normalized.includes("serviz") || normalized.includes("colazione") || normalized.includes("spa")) {
        priorities.push("services");
    }

    if (normalized.includes("mare") || normalized.includes("posizion") || normalized.includes("centro")) {
        priorities.push("location");
    }

    if (priorities.length === 0) {
        priorities.push("balance");
    }

    return priorities;
}

function resolveAdvice(trend: string, changePercent: number | null): "book_now" | "wait" | "stable" {
    if (trend === "down" && changePercent !== null && changePercent <= -10) {
        return "book_now";
    }

    if (trend === "up" && changePercent !== null && changePercent >= 10) {
        return "wait";
    }

    return "stable";
}

function buildScore(offer: HotelSearchOffer, trend: string, changePercent: number | null, priorities: string[]): number {
    let score = 100;
    let priceWeight = 0.18;

    if (priorities.includes("price")) {
        priceWeight += 0.08;
    }

    score -= offer.minTotalPrice * priceWeight;
    score += offer.stars * 7;
    score += offer.services.length * 3;

    if (priorities.includes("quality")) {
        score += offer.stars * 4;
    }

    if (priorities.includes("services")) {
        score += offer.services.length * 4;
    }

    if (trend === "down") {
        score += 12;
    }

    if (trend === "up") {
        score -= 8;
    }

    if (changePercent !== null && changePercent <= -15) {
        score += 8;
    }

    return Number(score.toFixed(2));
}

function buildSummary(bestOffer: HotelAnalyzedOffer | null): string {
    if (!bestOffer) {
        return "Nessun hotel disponibile per i filtri selezionati";
    }

    if (bestOffer.advice === "book_now") {
        return `Conviene prenotare ora: ${bestOffer.comment}`;
    }

    if (bestOffer.advice === "wait") {
        return `Potrebbe convenire aspettare: ${bestOffer.comment}`;
    }

    return `Hotel consigliato per rapporto qualità/prezzo: ${bestOffer.comment}`;
}

export function analyzeHotelOffers(
    offers: HotelSearchOffer[],
    history: RoomPriceHistoryRecord[],
    userPreference?: string
): HotelAnalysisResult {
    const priorities = inferPriorities(userPreference);

    const analyzedOffers: HotelAnalyzedOffer[] = offers.map((offer) => {
        const relatedHistory = history.find(
            (item) => item.room_id === offer.bestRoom.roomId && item.search_key === offer.searchKey
        );
        const trend = relatedHistory?.trend ?? "new";
        const comment = relatedHistory?.comment ?? "Prima rilevazione disponibile per la camera migliore di questo hotel";
        const changePercent = relatedHistory?.change_percent ?? null;

        return {
            ...offer,
            score: buildScore(offer, trend, changePercent, priorities),
            previousPrice: relatedHistory?.previous_price ?? null,
            changePercent,
            trend,
            comment,
            advice: resolveAdvice(trend, changePercent),
        };
    });

    const sortedByScore = [...analyzedOffers].sort((a, b) => b.score - a.score);
    const cheapestOffer = [...analyzedOffers].sort((a, b) => a.minTotalPrice - b.minTotalPrice)[0] ?? null;
    const premiumOffer = [...analyzedOffers].sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        return b.services.length - a.services.length;
    })[0] ?? null;
    const bestOffer = sortedByScore[0] ?? null;

    return {
        bestOffer,
        cheapestOffer,
        premiumOffer,
        alternatives: sortedByScore.slice(1, 4),
        summary: buildSummary(bestOffer),
        userPreferenceProfile: {
            rawPreference: userPreference,
            priorities,
        },
        keyFactors: bestOffer
            ? [
                `Prezzo totale a partire da: ${bestOffer.minTotalPrice} euro per ${bestOffer.nights} notti`,
                `Prezzo per notte a partire da: ${bestOffer.minPricePerNight} euro`,
                `Stelle hotel: ${bestOffer.stars}`,
                `Camere disponibili: ${bestOffer.availableRooms}`,
                `Servizi inclusi: ${bestOffer.services.join(", ") || "nessuno specificato"}`,
                `Trend prezzo: ${bestOffer.trend}`,
            ]
            : [],
        scenarioComparison: [
            bestOffer ? `Miglior compromesso: ${bestOffer.name} a partire da ${bestOffer.minTotalPrice} euro.` : "",
            cheapestOffer ? `Opzione più economica: ${cheapestOffer.name} a partire da ${cheapestOffer.minTotalPrice} euro.` : "",
            premiumOffer ? `Opzione più completa: ${premiumOffer.name} con ${premiumOffer.stars} stelle.` : "",
        ].filter(Boolean),
    };
}
