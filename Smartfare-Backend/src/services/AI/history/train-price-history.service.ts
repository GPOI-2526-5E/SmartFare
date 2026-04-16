import prisma from "../../../lib/prisma";
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

export async function saveTrainPriceHistory(offers: TrainSearchOffer[]): Promise<any[]> {
    const routeKeys = Array.from(new Set(offers.map((offer) => offer.routeKey)));

    if (routeKeys.length === 0) {
        return [];
    }

    // 1. Fetch latest history records for these route keys
    const previousHistoryRows = await prisma.trainPriceHistory.findMany({
        where: {
            routeKey: { in: routeKeys }
        },
        orderBy: {
            capturedAt: 'desc'
        }
    });

    const latestHistoryByRouteKey = new Map<string, any>();
    for (const row of previousHistoryRows) {
        if (!latestHistoryByRouteKey.has(row.routeKey)) {
            latestHistoryByRouteKey.set(row.routeKey, row);
        }
    }

    const rowsToInsert: any[] = [];
    const unchangedRows: any[] = [];

    for (const offer of offers) {
        const previousHistory = latestHistoryByRouteKey.get(offer.routeKey);
        const previousPrice = previousHistory ? Number(previousHistory.totalPrice) : null;
        const changePercent = calculateChangePercent(offer.price, previousPrice);
        const { trend, comment } = buildTrendComment(changePercent);

        if (previousPrice !== null && previousPrice === offer.price) {
            unchangedRows.push({
                ...previousHistory,
                comment: "Prezzo invariato rispetto all'ultima rilevazione"
            });
            continue;
        }

        rowsToInsert.push({
            trainOfferId: offer.trainOfferId,
            routeKey: offer.routeKey,
            totalPrice: offer.price,
            previousPrice: previousPrice,
            changePercent: changePercent,
            trend,
            comment,
        });
    }

    if (rowsToInsert.length > 0) {
        await prisma.trainPriceHistory.createMany({
            data: rowsToInsert
        });
        return [...rowsToInsert, ...unchangedRows];
    }

    return unchangedRows;
}
