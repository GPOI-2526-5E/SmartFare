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

function parseGuests(guests?: number): number {
    return Number.isFinite(Number(guests)) && Number(guests) > 0 ? Number(guests) : 1;
}

async function loadHotelSearchContext(): Promise<HotelSearchContext> {
    const supabase = getSupabaseClient();

    const [
        { data: hotelsData, error: hotelsError },
        { data: roomsData, error: roomsError },
        { data: locationsData, error: locationsError },
        { data: reservationsData, error: reservationsError },
        { data: reservationHotelsData, error: reservationHotelsError },
        { data: servicesData, error: servicesError },
        { data: serviceHotelsData, error: serviceHotelsError },
    ] = await Promise.all([
        supabase.from("hotels").select("*"),
        supabase.from("rooms").select("*"),
        supabase.from("locations").select("*"),
        supabase.from("reservation").select("*"),
        supabase.from("reservation_hotel").select("*"),
        supabase.from("services").select("*"),
        supabase.from("services_hotels").select("*"),
    ]);

    if (hotelsError) throw hotelsError;
    if (roomsError) throw roomsError;
    if (locationsError) throw locationsError;
    if (reservationsError) throw reservationsError;
    if (reservationHotelsError) throw reservationHotelsError;
    if (servicesError) throw servicesError;
    if (serviceHotelsError) throw serviceHotelsError;

    const hotels = (hotelsData ?? []) as HotelRecord[];
    const rooms = (roomsData ?? []) as RoomRecord[];
    const locations = (locationsData ?? []) as Location[];
    const reservations = (reservationsData ?? []) as ReservationRecord[];
    const reservationHotels = (reservationHotelsData ?? []) as ReservationHotelRecord[];
    const services = (servicesData ?? []) as ServiceRecord[];
    const serviceHotels = (serviceHotelsData ?? []) as ServiceHotelRecord[];
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
    console.log("[HOTELS][SEARCH] Parametri ricevuti:", {
        destination: params.destination,
        checkin: params.checkin,
        checkout: params.checkout,
        guests,
        nights,
        hotelId: hotelId ?? null,
    });
    const bookedRoomIds = buildBookedRoomIds(
        context.reservationHotels,
        context.reservationsById,
        params.checkin,
        params.checkout
    );
    console.log("[HOTELS][SEARCH] Camere prenotate nel range:", bookedRoomIds.size);
    const matchingHotelIds = new Set<number>();

    for (const hotel of context.hotels) {
        const location = hotel.location_id ? context.locationsById.get(hotel.location_id) : undefined;
        const destinationLabel = HotelUtilities.buildHotelLabel(hotel, location);
        const destinationMatch = [
            destinationLabel,
            hotel.city ?? "",
            location?.name ?? "",
            location?.province ?? "",
        ].join(" ");

        if (HotelUtilities.matchesSearch(destinationMatch, params.destination)) {
            matchingHotelIds.add(hotel.id);
        }
    }
    console.log("[HOTELS][SEARCH] Hotel che matchano la destinazione:", matchingHotelIds.size);

    const roomsWithHotel = context.rooms.filter((room) => typeof room.hotel_id === "number");
    const roomsWithCapacity = roomsWithHotel.filter((room) => Number(room.capacity ?? 0) >= guests);
    const roomsAvailable = roomsWithCapacity.filter((room) => !bookedRoomIds.has(room.id));
    const roomsForRequestedHotels = roomsAvailable.filter((room) => (hotelId ? room.hotel_id === hotelId : true));
    const roomsMatchingDestination = roomsForRequestedHotels.filter((room) =>
        matchingHotelIds.has(Number(room.hotel_id))
    );

    console.log("[HOTELS][SEARCH] Conteggi filtri camere:", {
        roomsWithHotel: roomsWithHotel.length,
        roomsWithCapacity: roomsWithCapacity.length,
        roomsAvailable: roomsAvailable.length,
        roomsForRequestedHotels: roomsForRequestedHotels.length,
        roomsMatchingDestination: roomsMatchingDestination.length,
    });

    return roomsMatchingDestination
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
    const context = await loadHotelSearchContext();
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

            // La card hotel usa la camera migliore come riferimento,
            // ma il dettaglio camere resta disponibile con un endpoint dedicato.
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
    const context = await loadHotelSearchContext();
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
