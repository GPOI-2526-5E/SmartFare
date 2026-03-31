export interface DatabaseConfig {
    url: string;
    serviceRoleKey: string;
}

export interface FlightOffer {
    airline: string;
    departureDate: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    previousPrice?: number;
    priceTrend?: string;
    stops: number;
    cabin?: string;
    availability: string;
    link?: string;
    departure: string;
    arrival: string;
}

export interface TrainOffer {
    company: string;
    departureDate: string;
    departureTime: string;
    arrivalTime: string;
    duration: string;
    price: number;
    previousPrice?: number;
    priceTrend?: string;
    trainType: string;
    changes: number;
    availability: string;
    link?: string;
    departure: string;
    arrival: string;
}

export interface TrainSegmentRecord {
    id: number;
    origin_station_id: number;
    destination_station_id: number;
    departure_time: string | null;
    arrival_time: string | null;
    train_id: number | null;
}

export interface ReservationTrainsRecord {
    id_train: number;
    id_reservation: number;
}

export interface TrainOfferRecord {
    id: number;
    train_id: number | null;
    origin_station_id: number;
    destination_station_id: number;
    departure_time: string | null;
    arrival_time: string | null;
    price: number | null;
    changes: number | null;
    available_seats: number | null;
}

export interface StationRecord {
    id: number;
    name: string | null;
    location_id: number | null;
}

export interface TrainPriceHistoryRecord {
    id: number;
    train_offer_id: number;
    route_key: string;
    total_price: number;
    captured_at: string;
    previous_price: number | null;
    change_percent: number | null;
    trend: string | null;
    comment: string | null;
}

export interface HotelRoomOption {
    roomId: number;
    type: string;
    price: number;
    capacity: number;
}

export interface HotelRecord {
    id: number;
    name: string;
    street: string | null;
    city: string | null;
    stars: number | null;
    location_id: number | null;
    longitude: number | null;
    latitude: number | null;
}

export interface RoomRecord {
    id: number;
    type: string;
    price: number | null;
    capacity: number | null;
    hotel_id: number | null;
}

export interface ReservationRecord {
    id: number;
    created_at?: string | null;
    price?: number | null;
    start_date: string | null;
    end_date: string | null;
    user_id?: number | null;
}

export interface ReservationHotelRecord {
    reservation_id: number;
    hotel_id: number | null;
    room_id: number;
}

export interface ServiceRecord {
    id: number;
    description: string;
}

export interface ServiceHotelRecord {
    hotel_id: number;
    service_id: number;
}

export interface RoomPriceHistoryRecord {
    id: number;
    room_id: number;
    hotel_id: number;
    search_key: string;
    price_per_night: number;
    total_price: number;
    checkin: string;
    checkout: string;
    guests: number;
    captured_at: string;
    previous_price: number | null;
    change_percent: number | null;
    trend: string | null;
    comment: string | null;
}

export interface HotelOffer {
    hotelId: number;
    name: string;
    city: string;
    address: string;
    stars: number;
    location: string;
    latitude: number | null;
    longitude: number | null;
    price: number;
    pricePerNight?: number;
    nights?: number;
    availability: string;
    availableRooms: number;
    roomOptions: HotelRoomOption[];
    services: string[];
}

export interface Location{
    id: number,
    cap: string,
    name: string,
    province?: string | null,
    latitude: number,
    longitude: number
}

export interface Airports{
    id: number,
    name: string,
    code: string
    location_id: Location['id'];
}
