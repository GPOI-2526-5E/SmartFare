import { getSupabaseClient } from "../../../config/database";
import { TrainPriceHistoryRecord } from "../../../models/database.model";
import { TrainSearchOffer } from "../types/train-ai.types";

function buildTrendComment(changePercent: number | null): { trend: string; comment: string } {
    if (changePercent === null) {
        return {
            trend: "new",
            comment: "Prima rilevazione disponibile per questo treno",
        };
    }

    if (changePercent <= -20) {
        return {
            trend: "down",
            comment: `Prezzo abbassato del ${Math.abs(changePercent)}%, molto consigliato`,
        };
    }

    if (changePercent < 0) {
        return {
            trend: "down",
            comment: `Prezzo in calo del ${Math.abs(changePercent)}%`,
        };
    }

    if (changePercent >= 20) {
        return {
            trend: "up",
            comment: `Prezzo aumentato del ${changePercent}%, valuta se prenotare subito`,
        };
    }

    if (changePercent > 0) {
        return {
            trend: "up",
            comment: `Prezzo aumentato del ${changePercent}%`,
        };
    }

    return {
        trend: "stable",
        comment: "Prezzo stabile",
    };
}

function calculateChangePercent(currentPrice: number, previousPrice: number | null): number | null {
    if (previousPrice === null || previousPrice <= 0) {
        return null;
    }

    return Number((((currentPrice - previousPrice) / previousPrice) * 100).toFixed(2));
}

export async function saveTrainPriceHistory(offers: TrainSearchOffer[]): Promise<TrainPriceHistoryRecord[]> {
    const supabase = getSupabaseClient();
    const savedHistory: TrainPriceHistoryRecord[] = [];

    for (const offer of offers) {
        const { data: previousHistoryData, error: previousHistoryError } = await supabase
            .from("train_price_history")
            .select("*")
            .eq("route_key", offer.routeKey)
            .order("captured_at", { ascending: false })
            .limit(1);

        if (previousHistoryError) {
            throw previousHistoryError;
        }

        const previousHistory = ((previousHistoryData ?? []) as TrainPriceHistoryRecord[])[0];
        const previousPrice = previousHistory ? Number(previousHistory.total_price) : null;
        const changePercent = calculateChangePercent(offer.price, previousPrice);
        const { trend, comment } = buildTrendComment(changePercent);

        if (previousPrice !== null && previousPrice === offer.price) {
            savedHistory.push({
                id: previousHistory?.id ?? 0,
                train_offer_id: offer.trainOfferId,
                route_key: offer.routeKey,
                total_price: offer.price,
                captured_at: previousHistory?.captured_at ?? new Date().toISOString(),
                previous_price: previousPrice,
                change_percent: 0,
                trend: "stable",
                comment: "Prezzo invariato rispetto all'ultima rilevazione",
            });

            continue;
        }

        const { data: insertedHistoryData, error: insertHistoryError } = await supabase
            .from("train_price_history")
            .insert({
                train_offer_id: offer.trainOfferId,
                route_key: offer.routeKey,
                total_price: offer.price,
                previous_price: previousPrice,
                change_percent: changePercent,
                trend,
                comment,
            })
            .select("*")
            .single();

        if (insertHistoryError) {
            throw insertHistoryError;
        }

        savedHistory.push(insertedHistoryData as TrainPriceHistoryRecord);
    }

    return savedHistory;
}
