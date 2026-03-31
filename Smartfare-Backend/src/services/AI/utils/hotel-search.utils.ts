import { HotelRecord, Location, RoomRecord } from "../../../models/database.model";

export default class HotelUtilities {
    static normalizeText(value: unknown): string {
        return String(value ?? "").trim().toLocaleLowerCase("it-IT");
    }

    static matchesSearch(value: string, query?: string): boolean {
        if (!query) {
            return true;
        }

        return this.normalizeText(value).includes(this.normalizeText(query));
    }

    static calculateNights(checkin?: string, checkout?: string): number {
        if (!checkin || !checkout) {
            return 1;
        }

        const start = new Date(`${checkin}T00:00:00`);
        const end = new Date(`${checkout}T00:00:00`);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
            return 1;
        }

        return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));
    }

    static overlaps(reservationStart: string, reservationEnd: string, checkin: string, checkout: string): boolean {
        return reservationStart < checkout && reservationEnd > checkin;
    }

    static buildHotelLabel(hotel: HotelRecord, location?: Location): string {
        return [
            hotel.name,
            hotel.city,
            location?.name,
            location?.province,
        ].filter(Boolean).join(", ");
    }

    static buildAddress(hotel: HotelRecord, location?: Location): string {
        return [hotel.street, hotel.city ?? location?.name].filter(Boolean).join(", ");
    }

    static buildSearchKey(room: RoomRecord, checkin: string, checkout: string, guests: number): string {
        return [room.id, checkin, checkout, guests].join("|");
    }
}
