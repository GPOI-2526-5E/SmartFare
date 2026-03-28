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

export interface Location{
    id: number,
    cap: string,
    name: string,
    latitude: number,
    longitude: number
}

export interface Airports{
    id: number,
    name: string,
    code: string
    location_id: Location['id'];
}