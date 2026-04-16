import prisma from "../../../lib/prisma";
import {
    HotelRecord,
    LocationRecord,
    RoomReservationRecord,
    RoomRecord,
} from "../../../models/database.model";
import { HotelSearchParams } from "../../../models/search-params.model";
import {
    HotelRoomOffer,
    HotelRoomsResult,
    HotelSearchOffer,
    HotelSearchResult,
} from "../types/hotel-ai.types";
import HotelUtilities from "../utils/hotel-search.utils";

interface HotelSearchContext {
    hotels: any[]; // Using any for simplicity in this transitional step, or specific Prisma types
    hotelsById: Map<number, any>;
    rooms: any[];
    locationsById: Map<number, any>;
    reservations: any[];
    servicesById: Map<number, string>;
}

const IN_BATCH_SIZE = 200;

function parsePositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function readRoomCapacity(room: Partial<RoomRecord> & Record<string, unknown>): number | null {
    const fallbackCapacity =
        room.capacity ??
        room.max_capacity ??
        room.max_guests ??
        room.guests ??
        room.people_capacity;

    return parsePositiveNumber(fallbackCapacity);
}

function parseGuests(guests?: number): number {
    return Number.isFinite(Number(guests)) && Number(guests) > 0 ? Number(guests) : 1;
}

function normalizeLikeValue(value?: string): string {
    return String(value ?? "")
        .trim()
        .replace(/[%(),]/g, " ")
        .replace(/\s+/g, " ");
}

function uniqueNumbers(values: Array<number | null | undefined>): number[] {
    return Array.from(
        new Set(values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)))
    );
}

async function loadHotelSearchContext(
    params: HotelSearchParams,
    hotelId?: number
): Promise<HotelSearchContext> {
    const guests = parseGuests(params.guests);
    const destinationQuery = normalizeLikeValue(params.destination);

    console.log("[HOTELS][SEARCH] Parametri ricevuti:", {
        destination: params.destination,
        checkin: params.checkin,
        checkout: params.checkout,
        guests,
        hotelId: hotelId ?? null,
    });

    // 1. Find matching locations
    let matchingLocationIds: number[] = [];
    if (destinationQuery) {
        const locations = await prisma.location.findMany({
            where: {
                OR: [
                    { name: { contains: destinationQuery, mode: 'insensitive' } },
                    { province: { contains: destinationQuery, mode: 'insensitive' } }
                ]
            },
            select: { locationId: true }
        });
        matchingLocationIds = locations.map((l: any) => l.locationId);
    }

    // 2. Query Hotels with relational data
    const hotels = await prisma.hotel.findMany({
        where: {
            AND: [
                hotelId ? { hotelId } : {},
                destinationQuery ? {
                    OR: [
                        { name: { contains: destinationQuery, mode: 'insensitive' } },
                        { city: { contains: destinationQuery, mode: 'insensitive' } },
                        { street: { contains: destinationQuery, mode: 'insensitive' } },
                        matchingLocationIds.length > 0 ? { locationId: { in: matchingLocationIds } } : {}
                    ]
                } : {}
            ]
        },
        include: {
            location: true,
            rooms: {
                where: {
                    capacity: { gte: guests }
                }
            },
            service: true
        }
    });

    console.log("[HOTELS][SEARCH] Hotel caricati dal DB:", hotels.length);

    if (hotels.length === 0) {
        return {
            hotels: [],
            hotelsById: new Map(),
            rooms: [],
            locationsById: new Map(),
            reservations: [],
            servicesById: new Map()
        };
    }

    const hotelIds = hotels.map((h: any) => h.hotelId);
    const roomIds = hotels.flatMap((h: any) => h.rooms.map((r: any) => r.roomId));

    // 3. Handle Reservations for availability filtering
    let reservations: any[] = [];
    if (params.checkin && params.checkout && roomIds.length > 0) {
        reservations = await prisma.roomReservation.findMany({
            where: {
                roomId: { in: roomIds },
                checkIn: { lt: params.checkout },
                checkOut: { gt: params.checkin }
            }
        });
    }

    const hotelsById = new Map<number, any>(hotels.map((h: any) => [h.hotelId, h]));
    const locationsById = new Map<number, any>();
    const servicesById = new Map<number, string>();
    const allRooms: any[] = [];

    for (const hotel of hotels) {
        if (hotel.location) {
            locationsById.set(hotel.location.locationId, hotel.location);
        }
        if (hotel.service) {
            servicesById.set(hotel.service.serviceId, hotel.service.description || "");
        }
        allRooms.push(...hotel.rooms);
    }

    return {
        hotels,
        hotelsById,
        rooms: allRooms,
        locationsById,
        reservations,
        servicesById
    };
}


function buildBookedRoomIds(
    reservations: any[],
    checkin?: string,
    checkout?: string
): Set<number> {
    const bookedRoomIds = new Set<number>();

    if (!checkin || !checkout) {
        return bookedRoomIds;
    }

    for (const res of reservations) {
        if (!res.checkIn || !res.checkOut) {
            continue;
        }

        if (HotelUtilities.overlaps(res.checkIn, res.checkOut, checkin, checkout)) {
            bookedRoomIds.add(res.roomId);
        }
    }

    return bookedRoomIds;
}

function buildRoomOffers(
    params: HotelSearchParams,
    context: HotelSearchContext,
    hotelId?: number
): HotelRoomOffer[] {
    const guests = parseGuests(params.guests);
    const nights = HotelUtilities.calculateNights(params.checkin, params.checkout);
    const bookedRoomIds = buildBookedRoomIds(
        context.reservations,
        params.checkin,
        params.checkout
    );
    console.log("[HOTELS][SEARCH] Camere prenotate nel range:", bookedRoomIds.size);

    const roomsAvailable = context.rooms.filter((room) => !bookedRoomIds.has(room.roomId));
    const roomsForRequestedHotels = roomsAvailable.filter((room) => (hotelId ? room.hotelId === hotelId : true));

    console.log("[HOTELS][SEARCH] Conteggi filtri camere:", {
        roomsLoaded: context.rooms.length,
        roomsAvailable: roomsAvailable.length,
        roomsForRequestedHotels: roomsForRequestedHotels.length,
    });

    return roomsForRequestedHotels
        .map((room) => {
            const hotel = context.hotelsById.get(Number(room.hotelId));
            if (!hotel) {
                return null;
            }

            const location = hotel.locationId ? context.locationsById.get(hotel.locationId) : undefined;
            const pricePerNight = Number(room.price ?? 0);
            const totalPrice = pricePerNight * nights;

            return {
                hotelId: hotel.hotelId,
                roomId: room.roomId,
                searchKey: HotelUtilities.buildSearchKey(room, params.checkin ?? "", params.checkout ?? "", guests),
                name: hotel.name,
                city: hotel.city ?? location?.name ?? "",
                address: HotelUtilities.buildAddress(hotel, location),
                stars: Number(hotel.stars ?? 0),
                location: [location?.name, location?.province].filter(Boolean).join(", "),
                latitude: hotel.latitude ?? location?.latitude ?? null,
                longitude: hotel.longitude ?? location?.longitude ?? null,
                pricePerNight,
                totalPrice,
                nights,
                guests,
                roomType: room.description || "Camera",
                roomCapacity: Number(room.capacity ?? 0),
                availability: "disponibile",
                services: hotel.service ? [hotel.service.description].filter(Boolean) : [],
            };
        })
        .filter((offer): offer is HotelRoomOffer => offer !== null)
        .sort((first, second) => first.totalPrice - second.totalPrice);
}

export async function searchHotelOffers(params: HotelSearchParams): Promise<HotelSearchResult> {
    const context = await loadHotelSearchContext(params);
    const roomOffers = buildRoomOffers(params, context);
    const hotelsById = new Map<number, HotelRoomOffer[]>();

    for (const offer of roomOffers) {
        const currentOffers = hotelsById.get(offer.hotelId) ?? [];
        currentOffers.push(offer);
        hotelsById.set(offer.hotelId, currentOffers);
    }

    const offers: HotelSearchOffer[] = Array.from(hotelsById.values())
        .map((hotelOffers) => {
            const sortedRooms = [...hotelOffers].sort((a, b) => a.totalPrice - b.totalPrice);
            const bestRoom = sortedRooms[0];

            return {
                hotelId: bestRoom.hotelId,
                searchKey: bestRoom.searchKey,
                name: bestRoom.name,
                city: bestRoom.city,
                address: bestRoom.address,
                stars: bestRoom.stars,
                location: bestRoom.location,
                latitude: bestRoom.latitude,
                longitude: bestRoom.longitude,
                minPricePerNight: bestRoom.pricePerNight,
                minTotalPrice: bestRoom.totalPrice,
                nights: bestRoom.nights,
                guests: bestRoom.guests,
                availability: "disponibile",
                services: bestRoom.services,
                availableRooms: sortedRooms.length,
                roomTypes: Array.from(new Set(sortedRooms.map((room) => room.roomType))),
                bestRoom: {
                    roomId: bestRoom.roomId,
                    roomType: bestRoom.roomType,
                    roomCapacity: bestRoom.roomCapacity,
                    pricePerNight: bestRoom.pricePerNight,
                    totalPrice: bestRoom.totalPrice,
                },
            };
        })
        .sort((first, second) => first.minTotalPrice - second.minTotalPrice);

    console.log("[HOTELS][SEARCH] Risultato finale hotel:", {
        roomOffers: roomOffers.length,
        hotels: offers.length,
    });

    return {
        filters: params,
        offers,
        searchedAt: new Date(),
        total: offers.length,
    };
}

export async function searchHotelRooms(
    hotelId: number,
    params: HotelSearchParams
): Promise<HotelRoomsResult> {
    const context = await loadHotelSearchContext(params, hotelId);
    const roomOffers = buildRoomOffers(params, context, hotelId);
    const hotel = context.hotelsById.get(hotelId);

    console.log("[HOTELS][ROOMS][SEARCH] Risultato finale camere:", {
        hotelId,
        hotelName: hotel?.name ?? null,
        rooms: roomOffers.length,
    });

    return {
        filters: params,
        hotelId,
        hotelName: hotel?.name ?? `Hotel ${hotelId}`,
        offers: roomOffers,
        searchedAt: new Date(),
        total: roomOffers.length,
    };
}

