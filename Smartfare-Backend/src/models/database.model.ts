export interface DatabaseConfig {
    url: string;
    serviceRoleKey: string;
}

export interface UserRecord {
    userId: number;
    email: string;
    passwordHash?: string | null;
    authProvider: string;
    sessionId?: string | null;
}

export interface UserDataRecord {
    userDataId: number;
    name?: string | null;
    surname?: string | null;
    street?: string | null;
    city?: string | null;
    avatarUrl?: string | null;
    userId: number;
}

export interface UserPreferenceRecord {
    preferenceId: number;
    budgetMin?: number | null;
    budgetMax?: number | null;
    userId: number;
}

export interface HotelRecord {
    hotelId: number;
    name: string;
    street?: string | null;
    stars?: number | null;
    city?: string | null;
    priceMedium?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    image?: string | null;
    locationId?: number | null;
    serviceId?: number | null;
}

export interface RoomRecord {
    roomId: number;
    price: number;
    capacity?: number | null;
    description?: string | null;
    hotelId: number;
}

export interface ServiceRecord {
    serviceId: number;
    name: string;
    description?: string | null;
}

export interface LocationRecord {
    locationId: number;
    name: string;
    province?: string | null;
    cap?: number | null;
    longitude?: number | null;
    latitude?: number | null;
}

export interface RoomReservationRecord {
    reservationId: number;
    totalPrice?: number | null;
    createdAt: string;
    status?: string | null;
    checkIn: string;
    checkOut: string;
    userId: number;
    roomId: number;
    itineraryId?: number | null;
}

export interface TrainRecord {
    trainId: number;
    trainCode: number;
    type?: string | null;
}

export interface TrainOfferRecord {
    offerId: number;
    price?: number | null;
    availableSeat?: number | null;
    trainId: number;
}

export interface TrainRouteSegmentRecord {
    segmentId: number;
    stopOrder?: number | null;
    arrivalTime: string;
    departureTime: string;
    offerId: number;
    originId: number;
    arrivalStationId: number;
    trainId: number;
}

export interface StationRecord {
    stationId: number;
    latitude?: number | null;
    longitude?: number | null;
    name: string;
    locationId?: number | null;
}

export interface AirportRecord {
    airportId: number;
    name: string;
    iata?: string | null;
    icao?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    locationId?: number | null;
}

export interface AircraftRecord {
    aircraftId: number;
    airline?: string | null;
    model?: string | null;
    capacity?: number | null;
}

export interface ActivityRecord {
    activityId: number;
    name: string;
    price?: number | null;
    duration: string;
    description?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    date: string;
    categoryId?: number | null;
}

export interface ActivityCategoryRecord {
    categoryId: number;
    name: string;
}

export interface ItineraryRecord {
    itineraryId: number;
    name?: string | null;
    description?: string | null;
    totalPrice?: number | null;
    isPublished: boolean;
    userId: number;
}

export interface RoomPriceHistoryRecord {
    id: number;
    totalPrice?: number | null;
    capturedAt: string;
    previousPrice?: number | null;
    changePercent?: number | null;
    trend?: string | null;
    comment?: string | null;
    searchKey: string;
    roomId: number;
    hotelId: number;
}

export interface TrainPriceHistoryRecord {
    id: number;
    totalPrice?: number | null;
    capturedAt: string;
    previousPrice?: number | null;
    changePercent?: number | null;
    trend?: string | null;
    comment?: string | null;
    routeKey: string;
    trainOfferId: number;
}

export interface FlightOfferRecord {
    offerId: number;
    price?: number | null;
    availableSeat?: number | null;
}

export interface FlightRouteSegmentRecord {
    segmentId: number;
    flightNumber?: string | null;
    departureTime: string;
    arrivalTime: string;
    durationTime: string;
    stopOrder?: number | null;
    offerId: number;
    originId: number;
    destinationId: number;
    aircraftId: number;
}

export interface FlightPriceHistoryRecord {
    id: number;
    totalPrice?: number | null;
    capturedAt: string;
    previousPrice?: number | null;
    changePercent?: number | null;
    trend?: string | null;
    comment?: string | null;
    routeKey: string;
    offerId: number;
}

export interface TrainReservationRecord {
    reservationId: number;
    totalPrice?: number | null;
    createdAt: string;
    status?: string | null;
    dateReservation: string;
    userId: number;
    trainOfferId: number;
    itineraryId?: number | null;
}

export interface FlightReservationRecord {
    reservationId: number;
    totalPrice?: number | null;
    createdAt: string;
    status?: string | null;
    dateReservation: string;
    userId: number;
    flightOfferId: number;
    itineraryId?: number | null;
}

export interface ActivityReservationRecord {
    reservationId: number;
    totalPrice?: number | null;
    createdAt: string;
    status?: string | null;
    dateReservation: string;
    userId: number;
    activityId: number;
    itineraryId?: number | null;
}
