import prisma from "../../../lib/prisma";
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

export async function saveHotelPriceHistory(offers: HotelSearchOffer[]): Promise<any[]> {
    const searchKeys = Array.from(new Set(offers.map((offer) => offer.searchKey)));
    console.log("[HOTELS][HISTORY] Search keys da storicizzare:", searchKeys.length);

    if (searchKeys.length === 0) {
        return [];
    }

    // 1. Fetch latest history records for these search keys
    const previousHistoryRows = await prisma.roomPriceHistory.findMany({
        where: {
            searchKey: { in: searchKeys }
        },
        orderBy: {
            capturedAt: 'desc'
        }
    });

    console.log("[HOTELS][HISTORY] Righe storico precedenti lette:", previousHistoryRows.length);

    const latestHistoryByRoomAndSearchKey = new Map<string, any>();
    for (const row of previousHistoryRows) {
        const historyKey = `${row.roomId}|${row.searchKey}`;
        if (!latestHistoryByRoomAndSearchKey.has(historyKey)) {
            latestHistoryByRoomAndSearchKey.set(historyKey, row);
        }
    }

    const rowsToInsert: any[] = [];
    const unchangedRows: any[] = [];

    for (const offer of offers) {
        const historyKey = `${offer.bestRoom.roomId}|${offer.searchKey}`;
        const previousHistory = latestHistoryByRoomAndSearchKey.get(historyKey);
        const previousPrice = previousHistory ? Number(previousHistory.totalPrice) : null;
        const changePercent = calculateChangePercent(offer.minTotalPrice, previousPrice);
        const { trend, comment } = buildTrendComment(changePercent);

        if (previousPrice !== null && previousPrice === offer.minTotalPrice) {
            unchangedRows.push({
                ...previousHistory,
                comment: "Prezzo invariato rispetto all'ultima rilevazione"
            });
            continue;
        }

        const [ , checkin, checkout ] = offer.searchKey.split("|");

        rowsToInsert.push({
            roomId: offer.bestRoom.roomId,
            hotelId: offer.hotelId,
            searchKey: offer.searchKey,
            pricePerNight: offer.bestRoom.pricePerNight,
            totalPrice: offer.minTotalPrice,
            checkIn: checkin,
            checkOut: checkout,
            guests: offer.guests,
            previousPrice: previousPrice,
            changePercent: changePercent,
            trend,
            comment,
        });
    }

    console.log("[HOTELS][HISTORY] Righe da inserire nello storico:", rowsToInsert.length);
    console.log("[HOTELS][HISTORY] Righe saltate per prezzo invariato:", unchangedRows.length);

    if (rowsToInsert.length > 0) {
        // Prisma createMany is efficient for batch inserts
        await prisma.roomPriceHistory.createMany({
            data: rowsToInsert
        });

        // We fetch them back or just return the constructed array (with some mapping if needed)
        // For simplicity, we return the concatenated list
        return [...rowsToInsert, ...unchangedRows];
    }

    return unchangedRows;
}
