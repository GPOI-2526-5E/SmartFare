import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../../config/database";
import {
    HotelRecord,
    Location,
    ReservationHotelRecord,
    ReservationRecord,
    RoomRecord,
    ServiceHotelRecord,
    ServiceRecord,
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
    hotels: HotelRecord[];
    hotelsById: Map<number, HotelRecord>;
    rooms: RoomRecord[];
    locationsById: Map<number, Location>;
    reservationsById: Map<number, ReservationRecord>;
    reservationHotels: ReservationHotelRecord[];
    servicesByHotel: Map<number, string[]>;
}

const IN_BATCH_SIZE = 200;

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

async function fetchInBatches<T>(
    supabase: SupabaseClient,
    table: string,
    column: string,
    ids: number[]
): Promise<T[]> {
    if (ids.length === 0) {
        return [];
    }

    const rows: T[] = [];
    for (let index = 0; index < ids.length; index += IN_BATCH_SIZE) {
        const chunk = ids.slice(index, index + IN_BATCH_SIZE);
        const { data, error } = await supabase.from(table).select("*").in(column, chunk);
        if (error) {
            throw error;
        }

        rows.push(...((data ?? []) as T[]));
    }

    return rows;
}

async function fetchRoomsByHotelsInBatches(
    supabase: SupabaseClient,
    hotelIds: number[],
    guests: number
): Promise<RoomRecord[]> {
    if (hotelIds.length === 0) {
        return [];
    }

    const rows: RoomRecord[] = [];
    for (let index = 0; index < hotelIds.length; index += IN_BATCH_SIZE) {
        const chunk = hotelIds.slice(index, index + IN_BATCH_SIZE);
        const { data, error } = await supabase
            .from("rooms")
            .select("*")
            .in("hotel_id", chunk)
            .gte("capacity", guests);

        if (error) {
            throw error;
        }

        rows.push(...((data ?? []) as RoomRecord[]));
    }

    return rows;
}

async function loadHotelSearchContext(
    params: HotelSearchParams,
    hotelId?: number
): Promise<HotelSearchContext> {
    const supabase = getSupabaseClient();
    const guests = parseGuests(params.guests);
    const destinationQuery = normalizeLikeValue(params.destination);

    console.log("[HOTELS][SEARCH] Parametri ricevuti:", {
        destination: params.destination,
        checkin: params.checkin,
        checkout: params.checkout,
        guests,
        hotelId: hotelId ?? null,
    });

    let matchingLocations: Location[] = [];
    if (destinationQuery) {
        const { data, error } = await supabase
            .from("locations")
            .select("*")
            .or(`name.ilike.%${destinationQuery}%,province.ilike.%${destinationQuery}%`);

        if (error) {
            throw error;
        }

        matchingLocations = (data ?? []) as Location[];
    }

    const locationIds = uniqueNumbers(matchingLocations.map((location) => location.id));
    console.log("[HOTELS][SEARCH] Location che matchano la destinazione:", locationIds.length);

    let hotelsQuery = supabase.from("hotels").select("*");
    if (hotelId) {
        hotelsQuery = hotelsQuery.eq("id", hotelId);
    } else if (destinationQuery) {
        const orParts = [
            `name.ilike.%${destinationQuery}%`,
            `city.ilike.%${destinationQuery}%`,
            `street.ilike.%${destinationQuery}%`,
        ];

        if (locationIds.length > 0) {
            orParts.push(`location_id.in.(${locationIds.join(",")})`);
        }

        hotelsQuery = hotelsQuery.or(orParts.join(","));
    }

    const { data: hotelsData, error: hotelsError } = await hotelsQuery;
    if (hotelsError) {
        throw hotelsError;
    }

    const hotels = (hotelsData ?? []) as HotelRecord[];
    const hotelIds = uniqueNumbers(hotels.map((hotel) => hotel.id));
    console.log("[HOTELS][SEARCH] Hotel caricati dal DB:", hotels.length);

    if (hotelIds.length === 0) {
        return {
            hotels: [],
            hotelsById: new Map(),
            rooms: [],
            locationsById: new Map(),
            reservationsById: new Map(),
            reservationHotels: [],
            servicesByHotel: new Map(),
        };
    }

    const rooms = await fetchRoomsByHotelsInBatches(supabase, hotelIds, guests);
    console.log("[HOTELS][SEARCH] Camere caricate dal DB dopo filtro hotel/capacity:", rooms.length);

    const reservationsPromise =
        params.checkin && params.checkout
            ? supabase
                .from("reservation")
                .select("*")
                .lt("start_date", params.checkout)
                .gt("end_date", params.checkin)
            : Promise.resolve({ data: [], error: null });

    const [locations, serviceHotels, reservations] = await Promise.all([
        fetchInBatches<Location>(supabase, "locations", "id", uniqueNumbers(hotels.map((hotel) => hotel.location_id))),
        fetchInBatches<ServiceHotelRecord>(supabase, "services_hotels", "hotel_id", hotelIds),
        reservationsPromise.then((result) => {
            if (result.error) {
                throw result.error;
            }

            return (result.data ?? []) as ReservationRecord[];
        }),
    ]);

    const reservationIds = uniqueNumbers(reservations.map((reservation) => reservation.id));
    const reservationHotels = await fetchInBatches<ReservationHotelRecord>(
        supabase,
        "reservation_hotel",
        "reservation_id",
        reservationIds
    );

    const serviceIds = uniqueNumbers(serviceHotels.map((relation) => relation.service_id));
    const services = await fetchInBatches<ServiceRecord>(supabase, "services", "id", serviceIds);

    console.log("[HOTELS][SEARCH] Record caricati dal DB:", {
        hotels: hotels.length,
        rooms: rooms.length,
        locations: locations.length,
        reservations: reservations.length,
        reservationHotels: reservationHotels.length,
        services: services.length,
        serviceHotels: serviceHotels.length,
    });

    const hotelsById = new Map<number, HotelRecord>(hotels.map((hotel) => [hotel.id, hotel]));
    const locationsById = new Map<number, Location>(locations.map((location) => [location.id, location]));
    const reservationsById = new Map<number, ReservationRecord>(
        reservations.map((reservation) => [reservation.id, reservation])
    );
    const servicesById = new Map<number, string>(services.map((service) => [service.id, service.description]));

    const servicesByHotel = new Map<number, string[]>();
    for (const relation of serviceHotels) {
        const description = servicesById.get(relation.service_id);
        if (!description) {
            continue;
        }

        const currentServices = servicesByHotel.get(relation.hotel_id) ?? [];
        currentServices.push(description);
        servicesByHotel.set(relation.hotel_id, currentServices);
    }

    return {
        hotels,
        hotelsById,
        rooms,
        locationsById,
        reservationsById,
        reservationHotels,
        servicesByHotel,
    };
}

function buildBookedRoomIds(
    reservationHotels: ReservationHotelRecord[],
    reservationsById: Map<number, ReservationRecord>,
    checkin?: string,
    checkout?: string
): Set<number> {
    const bookedRoomIds = new Set<number>();

    if (!checkin || !checkout) {
        return bookedRoomIds;
    }

    for (const relation of reservationHotels) {
        const reservation = reservationsById.get(relation.reservation_id);
        if (!reservation?.start_date || !reservation?.end_date) {
            continue;
        }

        if (HotelUtilities.overlaps(reservation.start_date, reservation.end_date, checkin, checkout)) {
            bookedRoomIds.add(relation.room_id);
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
        context.reservationHotels,
        context.reservationsById,
        params.checkin,
        params.checkout
    );
    console.log("[HOTELS][SEARCH] Camere prenotate nel range:", bookedRoomIds.size);

    const roomsAvailable = context.rooms.filter((room) => !bookedRoomIds.has(room.id));
    const roomsForRequestedHotels = roomsAvailable.filter((room) => (hotelId ? room.hotel_id === hotelId : true));

    console.log("[HOTELS][SEARCH] Conteggi filtri camere:", {
        roomsLoaded: context.rooms.length,
        roomsAvailable: roomsAvailable.length,
        roomsForRequestedHotels: roomsForRequestedHotels.length,
    });

    return roomsForRequestedHotels
        .map((room) => {
            const hotel = context.hotelsById.get(Number(room.hotel_id));
            if (!hotel) {
                return null;
            }

            const location = hotel.location_id ? context.locationsById.get(hotel.location_id) : undefined;
            const pricePerNight = Number(room.price ?? 0);
            const totalPrice = pricePerNight * nights;

            return {
                hotelId: hotel.id,
                roomId: room.id,
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
                roomType: room.type,
                roomCapacity: Number(room.capacity ?? 0),
                availability: "disponibile",
                services: context.servicesByHotel.get(hotel.id) ?? [],
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
