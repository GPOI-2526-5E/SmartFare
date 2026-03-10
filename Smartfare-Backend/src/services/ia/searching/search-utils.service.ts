export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeDateInput(dateInput: string): {
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
export function extractDateTimeParts(value: unknown): { date?: string; time?: string } {
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
export function formatDuration(durationMin?: number, durationText?: string): string {
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
export function mapAvailability(seatsAvailable?: number): string {
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
export function extractPriceTrend(train: any): { previousPrice?: number; priceTrend?: string } {
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
export function mapDocumentToOffer(doc: any, mode: "train" | "flight", datePrefix?: string): any {

    const departureParts = extractDateTimeParts(doc.departureTime || doc.departureDate);
    const arrivalParts = extractDateTimeParts(doc.arrivalTime || doc.arrivalDate);

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
