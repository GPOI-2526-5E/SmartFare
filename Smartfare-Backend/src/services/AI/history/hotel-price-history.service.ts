import { getSupabaseClient } from "../../../config/database";
import { RoomPriceHistoryRecord } from "../../../models/database.model";
import { HotelSearchOffer } from "../types/hotel-ai.types";

function buildTrendComment(changePercent: number | null): { trend: string; comment: string } {
    if (changePercent === null) {
        return {
            trend: "new",
            comment: "Prima rilevazione disponibile per questa camera",
        };
    }

    if (changePercent <= -15) {
        return {
            trend: "down",
            comment: `Prezzo abbassato del ${Math.abs(changePercent)}%, molto interessante`,
        };
    }

    if (changePercent < 0) {
        return {
            trend: "down",
            comment: `Prezzo in calo del ${Math.abs(changePercent)}%`,
        };
    }

    if (changePercent >= 15) {
        return {
            trend: "up",
            comment: `Prezzo aumentato del ${changePercent}%, valuta se aspettare`,
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

export async function saveHotelPriceHistory(offers: HotelSearchOffer[]): Promise<RoomPriceHistoryRecord[]> {
    const supabase = getSupabaseClient();
    const searchKeys = Array.from(new Set(offers.map((offer) => offer.searchKey)));
    console.log("[HOTELS][HISTORY] Search keys da storicizzare:", searchKeys.length);

    if (searchKeys.length === 0) {
        return [];
    }

    // Leggiamo lo storico in blocco invece di fare una query per hotel:
    // con molte strutture questa è la parte che rallentava di più.
    const { data: previousHistoryData, error: previousHistoryError } = await supabase
        .from("room_price_history")
        .select("*")
        .in("search_key", searchKeys)
        .order("captured_at", { ascending: false });

    if (previousHistoryError) {
        throw previousHistoryError;
    }
    console.log("[HOTELS][HISTORY] Righe storico precedenti lette:", (previousHistoryData ?? []).length);

    const latestHistoryBySearchKey = new Map<string, RoomPriceHistoryRecord>();
    for (const row of (previousHistoryData ?? []) as RoomPriceHistoryRecord[]) {
        if (!latestHistoryBySearchKey.has(row.search_key)) {
            latestHistoryBySearchKey.set(row.search_key, row);
        }
    }

    const rowsToInsert = offers.map((offer) => {
        const previousHistory = latestHistoryBySearchKey.get(offer.searchKey);
        const previousPrice = previousHistory ? Number(previousHistory.total_price) : null;
        const changePercent = calculateChangePercent(offer.minTotalPrice, previousPrice);
        const { trend, comment } = buildTrendComment(changePercent);

        return {
            room_id: offer.bestRoom.roomId,
            hotel_id: offer.hotelId,
            search_key: offer.searchKey,
            price_per_night: offer.bestRoom.pricePerNight,
            total_price: offer.minTotalPrice,
            checkin: offer.searchKey.split("|")[1],
            checkout: offer.searchKey.split("|")[2],
            guests: offer.guests,
            previous_price: previousPrice,
            change_percent: changePercent,
            trend,
            comment,
        };
    });
    console.log("[HOTELS][HISTORY] Righe da inserire nello storico:", rowsToInsert.length);

    const { data: insertedHistoryData, error: insertHistoryError } = await supabase
        .from("room_price_history")
        .insert(rowsToInsert)
        .select("*");

    if (insertHistoryError) {
        throw insertHistoryError;
    }
    console.log("[HOTELS][HISTORY] Righe storico inserite:", (insertedHistoryData ?? []).length);

    return (insertedHistoryData ?? []) as RoomPriceHistoryRecord[];
}
