export interface BaseSearchParams {
    from?: string;
    to?: string;
    date: string;
    passengers?: number;
    userPreference?: string;
}
export interface TrainSearchParams extends BaseSearchParams {
    originStationId: number;
    destinationStationId: number;
    trainType?: string; // es: "Frecciarossa", "Frecciargento", "Regionale"
    maxChanges?: number;
}

export interface HotelSearchParams {
    destination?: string;
    checkin?: string;
    checkout?: string;
    guests?: number;
    userPreference?: string;
}

export interface FlightSearchParams extends BaseSearchParams {
    cabin?: "economy" | "premium" | "business" | "first";
    maxStops?: number;
    airline?: string;
}
