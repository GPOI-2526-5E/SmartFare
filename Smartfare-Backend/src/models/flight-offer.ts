export interface FlightOffer {
    airline: string;
    flightNumber: string;
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
