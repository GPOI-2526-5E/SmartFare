import { Location as DbLocation, StationRecord } from "../../../models/database.model";

export default class Utilites {

    static normalizeText(value: unknown): string {
        return String(value ?? "").trim().toLocaleLowerCase("it-IT");
    }

    static matchesSearch(value: string, query?: string): boolean {
        if (!query) {
            return true;
        }

        return this.normalizeText(value).includes(this.normalizeText(query));
    }

    static toDateParts(value: string | null | undefined): { date: string; time: string } {
        if (!value) {
            return { date: "", time: "" };
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return { date: "", time: "" };
        }

        return {
            date: parsed.toISOString().slice(0, 10),
            time: parsed.toISOString().slice(11, 16),
        };
    }

    static formatDuration(startValue: string | null, endValue: string | null): string {
        if (!startValue || !endValue) {
            return "";
        }

        const start = new Date(startValue);
        const end = new Date(endValue);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return "";
        }

        const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${hours}h ${minutes}min`;
    }

    static buildStationLabel(station: StationRecord | undefined, location: DbLocation | undefined): string {
        const stationName = station?.name?.trim() ?? "";
        const locationName = location?.name?.trim() ?? "";
        const province = location?.province?.trim() ?? "";

        return [stationName, locationName, province].filter(Boolean).join(", ");
    }

    static buildRouteKey(from: string, to: string, departureDate: string, departureTime: string, trainId: number | null): string {
        return [
            Utilites.normalizeText(from).replace(/\s+/g, "-"),
            Utilites.normalizeText(to).replace(/\s+/g, "-"),
            departureDate || "no-date",
            departureTime || "no-time",
            trainId ?? "no-train",
        ].join("|");
    }

}
