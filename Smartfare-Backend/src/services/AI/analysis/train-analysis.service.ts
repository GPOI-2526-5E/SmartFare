import { TrainPriceHistoryRecord } from "../../../models/database.model";
import { TrainAnalysisResult, TrainAnalyzedOffer, TrainSearchOffer } from "../types/train-ai.types";

function extractDurationMinutes(duration: string): number {
    const hoursMatch = duration.match(/(\d+)h/);
    const minutesMatch = duration.match(/(\d+)min/);
    const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
    return (hours * 60) + minutes;
}

function normalizePreference(preference?: string): string {
    return String(preference ?? "").trim().toLocaleLowerCase("it-IT");
}

function inferPriorities(userPreference?: string): string[] {
    const normalized = normalizePreference(userPreference);
    const priorities: string[] = [];

    if (normalized.includes("econom") || normalized.includes("spend") || normalized.includes("prezzo")) {
        priorities.push("price");
    }

    if (normalized.includes("veloc") || normalized.includes("rapido") || normalized.includes("tempo")) {
        priorities.push("duration");
    }

    if (normalized.includes("comod") || normalized.includes("cambi") || normalized.includes("diretto")) {
        priorities.push("changes");
    }

    if (normalized.includes("fless") || normalized.includes("aspett")) {
        priorities.push("timing");
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

function buildScore(
    offer: TrainSearchOffer,
    trend: string,
    changePercent: number | null,
    priorities: string[]
): number {
    let priceWeight = 0.45;
    let durationWeight = 0.08;
    let changePenalty = 8;

    if (priorities.includes("price")) {
        priceWeight += 0.10;
    }

    if (priorities.includes("duration")) {
        durationWeight += 0.05;
    }

    if (priorities.includes("changes")) {
        changePenalty += 4;
    }

    let score = 100;
    score -= offer.price * priceWeight;
    score -= extractDurationMinutes(offer.duration) * durationWeight;
    score -= offer.changes * changePenalty;

    if (offer.availability === "disponibile") {
        score += 10;
    }

    if (trend === "down") {
        score += 15;
    }

    if (trend === "up") {
        score -= 10;
    }

    if (changePercent !== null && changePercent <= -20) {
        score += 10;
    }

    return Number(score.toFixed(2));
}

function buildSummary(bestOffer: TrainAnalyzedOffer | null): string {
    if (!bestOffer) {
        return "Nessuna offerta disponibile per i filtri selezionati";
    }

    if (bestOffer.advice === "book_now") {
        return `Conviene prenotare ora: ${bestOffer.comment}`;
    }

    if (bestOffer.advice === "wait") {
        return `Potrebbe convenire aspettare: ${bestOffer.comment}`;
    }

    return `Offerta consigliata per rapporto qualità/prezzo: ${bestOffer.comment}`;
}

function buildKeyFactors(bestOffer: TrainAnalyzedOffer | null, priorities: string[]): string[] {
    if (!bestOffer) {
        return [];
    }

    const factors = [
        `Prezzo attuale: ${bestOffer.price} euro`,
        `Durata del viaggio: ${bestOffer.duration || "non disponibile"}`,
        `Numero di cambi: ${bestOffer.changes}`,
        `Trend prezzo: ${bestOffer.trend}`,
    ];

    if (priorities.includes("price")) {
        factors.push("La preferenza utente dà maggiore peso al risparmio economico.");
    }

    if (priorities.includes("duration")) {
        factors.push("La preferenza utente valorizza soprattutto il tempo di viaggio.");
    }

    if (priorities.includes("changes")) {
        factors.push("La preferenza utente penalizza i viaggi con troppi cambi.");
    }

    return factors;
}

function buildScenarioComparison(
    bestOffer: TrainAnalyzedOffer | null,
    cheapestOffer: TrainAnalyzedOffer | null,
    fastestOffer: TrainAnalyzedOffer | null
): string[] {
    const scenarios: string[] = [];

    if (bestOffer) {
        scenarios.push(`Miglior compromesso: ${bestOffer.company} a ${bestOffer.price} euro con ${bestOffer.duration}.`);
    }

    if (cheapestOffer) {
        scenarios.push(`Opzione più economica: ${cheapestOffer.company} a ${cheapestOffer.price} euro.`);
    }

    if (fastestOffer) {
        scenarios.push(`Opzione più veloce: ${fastestOffer.company} con durata ${fastestOffer.duration}.`);
    }

    return scenarios;
}

export function analyzeTrainOffers(
    offers: TrainSearchOffer[],
    history: TrainPriceHistoryRecord[],
    userPreference?: string
): TrainAnalysisResult {
    const priorities = inferPriorities(userPreference);

    const analyzedOffers: TrainAnalyzedOffer[] = offers.map((offer) => {
        const relatedHistory = history.find((item) => item.train_offer_id === offer.trainOfferId);
        const trend = relatedHistory?.trend ?? "new";
        const comment = relatedHistory?.comment ?? "Prima rilevazione disponibile per questo treno";
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

    const sortedByScore = [...analyzedOffers].sort((first, second) => second.score - first.score);
    const cheapestOffer = [...analyzedOffers].sort((first, second) => first.price - second.price)[0] ?? null;
    const fastestOffer = [...analyzedOffers].sort(
        (first, second) => extractDurationMinutes(first.duration) - extractDurationMinutes(second.duration)
    )[0] ?? null;
    const bestOffer = sortedByScore[0] ?? null;

    return {
        bestOffer,
        cheapestOffer,
        fastestOffer,
        alternatives: sortedByScore.slice(1, 4),
        summary: buildSummary(bestOffer),
        userPreferenceProfile: {
            rawPreference: userPreference,
            priorities,
        },
        keyFactors: buildKeyFactors(bestOffer, priorities),
        scenarioComparison: buildScenarioComparison(bestOffer, cheapestOffer, fastestOffer),
    };
}
