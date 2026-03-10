import { Flight, Train } from "../../../models/database.model";
import { escapeRegex, mapDocumentToOffer, normalizeDateInput } from "./search-utils.service";

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
