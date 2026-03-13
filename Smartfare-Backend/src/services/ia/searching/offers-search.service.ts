import { Flight, Train } from "../../../models/database.model";
import { escapeRegex, mapDocumentToOffer, normalizeDateInput } from "./search-utils.service";

export async function searchOffers(params: any, mode: "train" | "flight" = "train"): Promise<any[]> {
    try {
        const collectionName = mode === "flight" ? "Flights" : "Trains";

        const { datePrefix, startDate, endDate } = normalizeDateInput(params.date);
        const dateRegex = datePrefix ? new RegExp(`^${escapeRegex(datePrefix)}(?:$|T)`) : undefined;

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

        let docs: any[];
        if (mode === "flight") {
            docs = await Flight.find(finalFilter).lean().exec();
        } else {
            docs = await Train.find(finalFilter).lean().exec();
        }

        console.log(`✅ ${collectionName} trovati`, { count: docs.length });

        const offers = docs.map((doc: any) => mapDocumentToOffer(doc, mode, datePrefix));

        return offers;
    } catch (error) {
        console.error(`Errore ricerca DB (${mode}):`, error);
        return [];
    }
}
