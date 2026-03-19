import { getSupabaseClient } from "../../../config/database";
import { escapeRegex, mapDocumentToOffer, normalizeDateInput } from "./search-utils.service";

function toFilterValue(value: string): string {
    return encodeURIComponent(value.trim());
}

function toPrefixFilterValue(value: string): string {
    return encodeURIComponent(`${value}%`);
}

export async function searchOffers(params: any, mode: "train" | "flight" = "train"): Promise<any[]> {
    try {
        const tableName = mode === "flight" ? "flights" : "trains";
        const supabase = getSupabaseClient();

        const { datePrefix, startDate, endDate } = normalizeDateInput(params.date);
        const dateRegex = datePrefix ? new RegExp(`^${escapeRegex(datePrefix)}(?:$|T)`) : undefined;

        const departureValue = toFilterValue(params.from || "");
        const arrivalValue = toFilterValue(params.to || "");

        const departureFields = ["departure", "departure_airport", "origin"];
        const arrivalFields = ["arrival", "arrival_airport", "destination"];

        let query = supabase.from(tableName).select("*");

        if (departureValue) {
            query = query.or(departureFields.map((field) => `${field}.ilike.${departureValue}`).join(","));
        }

        if (arrivalValue) {
            query = query.or(arrivalFields.map((field) => `${field}.ilike.${arrivalValue}`).join(","));
        }

        if (datePrefix) {
            query = query.or([
                `departure_time.ilike.${toPrefixFilterValue(datePrefix)}`,
                `departure_date.ilike.${toPrefixFilterValue(datePrefix)}`,
            ].join(","));
        }

        const { data: docs, error } = await query.limit(500);

        if (error) {
            throw error;
        }

        const filteredDocs = (docs || []).filter((doc: any) => {
            if (!dateRegex || !startDate || !endDate) {
                return true;
            }

            const departureTime = typeof doc.departure_time === "string" ? doc.departure_time : "";
            const departureDate = typeof doc.departure_date === "string" ? doc.departure_date : "";

            const departureTimeDate = new Date(departureTime);
            const inRangeByTimestamp = !Number.isNaN(departureTimeDate.getTime())
                ? departureTimeDate >= startDate && departureTimeDate < endDate
                : false;

            return inRangeByTimestamp || dateRegex.test(departureTime) || dateRegex.test(departureDate);
        });

        console.log(`✅ ${tableName} trovati`, { count: filteredDocs.length });

        const offers = filteredDocs.map((doc: any) => mapDocumentToOffer(doc, mode, datePrefix));

        return offers;
    } catch (error) {
        console.error(`Errore ricerca DB (${mode}):`, error);
        return [];
    }
}
