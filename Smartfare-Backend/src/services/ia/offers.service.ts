import { Flight, Train } from "../../models/database.model";

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeDateInput(dateInput: string): {
    datePrefix?: string;
    startDate?: Date;
    endDate?: Date;
} {
    if (!dateInput) {
        return {};
    }

    const isoMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const itaMatch = dateInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    let datePrefix: string | undefined;

    if (isoMatch) {
        datePrefix = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    } else if (itaMatch) {
        datePrefix = `${itaMatch[3]}-${itaMatch[2]}-${itaMatch[1]}`;
    } else {
        const parsed = new Date(dateInput);
        if (!Number.isNaN(parsed.getTime())) {
            datePrefix = parsed.toISOString().slice(0, 10);
        }
    }

    if (!datePrefix) {
        return {};
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePrefix)) {
        return {};
    }

    const startDate = new Date(`${datePrefix}T00:00:00.000Z`);
    const endDate = new Date(`${datePrefix}T00:00:00.000Z`);
    endDate.setUTCDate(endDate.getUTCDate() + 1);

    return { datePrefix, startDate, endDate };
}

function extractDateTimeParts(value: unknown): { date?: string; time?: string } {
    if (typeof value === "string") {
        const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
        if (match) {
            return { date: match[1], time: match[2] };
        }

        const dateOnly = value.match(/^(\d{4}-\d{2}-\d{2})$/);
        if (dateOnly) {
            return { date: dateOnly[1] };
        }
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return {
            date: value.toISOString().slice(0, 10),
            time: value.toISOString().slice(11, 16),
        };
    }

    return {};
}

function formatDuration(durationMin?: number, durationText?: string): string {
    if (typeof durationText === "string" && durationText.trim().length > 0) {
        return durationText;
    }

    if (typeof durationMin === "number" && !Number.isNaN(durationMin)) {
        const hours = Math.floor(durationMin / 60);
        const minutes = durationMin % 60;
        return `${hours}h ${minutes}min`;
    }

    return "";
}

function mapAvailability(seatsAvailable?: number): string {
    if (typeof seatsAvailable !== "number") {
        return "disponibile";
    }

    if (seatsAvailable <= 0) {
        return "esaurito";
    }

    if (seatsAvailable <= 10) {
        return "pochi posti";
    }

    return "disponibile";
}

function extractPriceTrend(train: any): { previousPrice?: number; priceTrend?: string } {
    const currentPrice = Number(train.priceEUR ?? train.price ?? NaN);
    const previousPrice = Number(
        train.previousPriceEUR ?? train.previousPrice ?? train.lastPrice ?? NaN
    );

    if (Number.isNaN(currentPrice) || Number.isNaN(previousPrice)) {
        return {};
    }

    if (currentPrice > previousPrice) {
        return { previousPrice, priceTrend: "in aumento" };
    }

    if (currentPrice < previousPrice) {
        return { previousPrice, priceTrend: "in discesa" };
    }

    return { previousPrice, priceTrend: "stabile" };
}

function mapDocumentToOffer(doc: any, mode: "train" | "flight", datePrefix?: string): any {
    console.log(`🔍 mapDocumentToOffer - Input doc fields:`, {
        departureDate: doc.departureDate,
        departureTime: doc.departureTime,
        arrivalTime: doc.arrivalTime,
        arrivalDate: doc.arrivalDate,
        datePrefix,
    });

    const departureParts = extractDateTimeParts(doc.departureTime || doc.departureDate);
    const arrivalParts = extractDateTimeParts(doc.arrivalTime || doc.arrivalDate);

    console.log(`🔍 mapDocumentToOffer - Extracted parts:`, {
        departureParts,
        arrivalParts,
    });

    const priceInfo = extractPriceTrend(doc);

    const departure = doc.departure || doc.departureAirport || doc.origin || doc.from || "";
    const arrival = doc.arrival || doc.arrivalAirport || doc.destination || doc.to || "";

    const base = {
        provider: doc.company || doc.airline || "",
        departureDate: departureParts.date || datePrefix || "",
        departureTime: departureParts.time || "",
        arrivalTime: arrivalParts.time || "",
        duration: formatDuration(doc.durationMin, doc.duration),
        price: Number(doc.priceEUR ?? doc.price ?? 0),
        availability: mapAvailability(doc.seatsAvailable ?? doc.availableSeats),
        link: doc.link,
        departure,
        arrival,
        ...priceInfo,
    } as any;

    if (mode === "train") {
        return {
            ...base,
            company: base.provider,
            trainType: doc.trainType || "",
            changes: Number(doc.changes ?? 0),
        };
    }

    return {
        ...base,
        airline: base.provider,
        flightNumber: doc.flightNumber || doc.trainType || "",
        stops: Number(doc.stops ?? doc.changes ?? 0),
        cabin: doc.cabin || undefined,
    };
}

export async function searchOffers(params: any, mode: "train" | "flight" = "train"): Promise<any[]> {
    try {
        console.log(`🔌 Avvio query DB (${mode.toUpperCase()})`, {
            from: params.from,
            to: params.to,
            date: params.date,
            passengers: params.passengers || 1,
        });

        const collectionName = mode === "flight" ? "Flights" : "Trains";
        const { datePrefix, startDate, endDate } = normalizeDateInput(params.date);
        const dateRegex = datePrefix ? new RegExp(`^${escapeRegex(datePrefix)}(?:$|T)`) : undefined;

        console.log("🗓️ Filtro data normalizzato", {
            datePrefix,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
        });

        const departureRegex = new RegExp(`^${escapeRegex(params.from)}$`, "i");
        const arrivalRegex = new RegExp(`^${escapeRegex(params.to)}$`, "i");

        const departureFields = ["departure", "departureAirport", "origin", "from"];
        const arrivalFields = ["arrival", "arrivalAirport", "destination", "to"];

        const orClauses: any[] = [];
        for (const f of departureFields) orClauses.push({ [f]: departureRegex });
        for (const f of arrivalFields) orClauses.push({ [f]: arrivalRegex });

        const filter: any = { $and: [] };
        filter.$and.push({ $or: orClauses.slice(0, departureFields.length) });
        filter.$and.push({ $or: orClauses.slice(departureFields.length) });

        if (startDate && endDate && dateRegex) {
            filter.$and.push({
                $or: [
                    { departureTime: { $gte: startDate, $lt: endDate } },
                    { departureTime: { $regex: dateRegex } },
                    { departureDate: { $regex: dateRegex } },
                ],
            });
        } else if (dateRegex) {
            filter.$and.push({ $or: [{ departureTime: { $regex: dateRegex } }, { departureDate: { $regex: dateRegex } }] });
        }

        const finalFilter = filter.$and.length > 0 ? filter : {};

        console.log(`🔍 Filtro query ${collectionName}`, finalFilter);

        let docs: any[];
        if (mode === "flight") {
            docs = await Flight.find(finalFilter).lean().exec();
        } else {
            docs = await Train.find(finalFilter).lean().exec();
        }

        console.log(`✅ ${collectionName} trovati`, { count: docs.length });

        if (docs.length > 0) {
            console.log(`🔍 PRIMO DOCUMENTO RAW DAL DB (${collectionName}):`, JSON.stringify(docs[0], null, 2));
            console.log(`🔍 CAMPI DATA/ORA DEL PRIMO DOC:`, {
                departureDate: docs[0].departureDate,
                departureTime: docs[0].departureTime,
                arrivalTime: docs[0].arrivalTime,
                arrivalDate: docs[0].arrivalDate,
                _id: docs[0]._id,
                company: docs[0].company,
                airline: docs[0].airline,
            });
        }

        if (docs.length === 0) {
            try {
                let estimatedCount: number;
                let sampleDoc: any;

                if (mode === "flight") {
                    estimatedCount = await Flight.estimatedDocumentCount();
                    sampleDoc = await Flight.findOne().lean().exec();
                } else {
                    estimatedCount = await Train.estimatedDocumentCount();
                    sampleDoc = await Train.findOne().lean().exec();
                }

                console.log(`🧪 ${collectionName} diagnostics`, {
                    collection: collectionName,
                    estimatedCount,
                    sampleKeys: sampleDoc ? Object.keys(sampleDoc) : [],
                    sampleDepartureTime: sampleDoc?.departureTime ?? sampleDoc?.departureDate,
                    sampledeparture: sampleDoc?.departure ?? sampleDoc?.departure,
                    samplearrival: sampleDoc?.arrival ?? sampleDoc?.arrival,
                });
            } catch (diagError) {
                console.error(`❌ Errore diagnostica ${collectionName}:`, diagError);
            }
        }

        const offers = docs.map((doc: any) => mapDocumentToOffer(doc, mode, datePrefix));

        if (offers.length > 0) {
            console.log(`🔍 PRIMA OFFERTA MAPPATA:`, JSON.stringify(offers[0], null, 2));
            console.log(`🔍 CAMPI DATA/ORA DOPO MAPPATURA:`, {
                departureDate: offers[0].departureDate,
                departureTime: offers[0].departureTime,
                arrivalTime: offers[0].arrivalTime,
            });
        }

        return offers;
    } catch (error) {
        console.error(`Errore ricerca DB (${mode}):`, error);
        return [];
    }
}

export function calculateOfferScore(offer: any): number {
    let score = 100;

    score -= offer.price * 0.5;

    const changes = offer.changes ?? offer.stops ?? 0;
    score -= changes * 10;

    const durationMatch = offer.duration.match(/(\d+)h/);
    if (durationMatch) {
        score -= parseInt(durationMatch[1]) * 5;
    }

    if (offer.availability === "disponibile") {
        score += 20;
    }

    return score;
}
